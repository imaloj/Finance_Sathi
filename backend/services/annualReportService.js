import mongoose from 'mongoose';
import { Mistral } from '@mistralai/mistralai';
import Transaction from '../models/Transaction.js';
import AIReport from '../models/AIReport.js';
import AnnualReport from '../models/AnnualReport.js';
import User from '../models/User.js';
import { getRedis } from '../config/redis.js';
import { formatCurrency } from '../utils/currency.js';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const MODEL = 'mistral-small-latest';

// ============================================
// DATA AGGREGATION
// ============================================

const getAnnualData = async (userId, year) => {
  // Single aggregation: totals + monthly breakdown + top categories
  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        year: parseInt(year)
      }
    },
    {
      $facet: {
        // Overall annual totals by type
        totals: [
          { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ],
        // Month-by-month breakdown
        monthly: [
          {
            $group: {
              _id: { month: '$month', type: '$type' },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { '_id.month': 1 } }
        ],
        // Top expense categories for the year
        categories: [
          { $match: { type: 'expense' } },
          { $group: { _id: '$category', amount: { $sum: '$amount' } } },
          { $sort: { amount: -1 } },
          { $limit: 8 }
        ],
        totalTransactions: [{ $count: 'total' }]
      }
    }
  ]);

  const data = result[0];
  const income  = data.totals.find(t => t._id === 'income')?.total  || 0;
  const expense = data.totals.find(t => t._id === 'expense')?.total || 0;
  const saving  = data.totals.find(t => t._id === 'saving')?.total  || 0;
  const totalExpense = expense || 1;

  // Shape monthly breakdown into 12-slot array
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mIncome  = data.monthly.find(r => r._id.month === m && r._id.type === 'income')?.total  || 0;
    const mExpense = data.monthly.find(r => r._id.month === m && r._id.type === 'expense')?.total || 0;
    const mSaving  = data.monthly.find(r => r._id.month === m && r._id.type === 'saving')?.total  || 0;
    return { month: m, income: mIncome, expense: mExpense, saving: mSaving, net: mIncome - mExpense - mSaving };
  });

  const topCategories = data.categories.map(c => ({
    category:   c._id,
    amount:     c.amount,
    percentage: Math.round((c.amount / totalExpense) * 100)
  }));

  return {
    income, expense, saving,
    net: income - expense - saving,
    monthlyBreakdown,
    topCategories,
    totalTransactions: data.totalTransactions[0]?.total || 0
  };
};

const getPreviousYearTotals = async (userId, year) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        year: parseInt(year) - 1
      }
    },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]);

  if (!result.length) return null;

  return {
    income:  result.find(t => t._id === 'income')?.total  || 0,
    expense: result.find(t => t._id === 'expense')?.total || 0,
    saving:  result.find(t => t._id === 'saving')?.total  || 0
  };
};

// Pull any existing monthly AI reports to use as context (hybrid approach)
const getExistingMonthlyInsights = async (userId, year) => {
  const reports = await AIReport.find(
    { user: userId, year: parseInt(year) },
    { month: 1, summary: 1, financialHealthScore: 1, insights: 1 }
  ).sort({ month: 1 });

  return reports.map(r => ({
    month: r.month,
    score: r.financialHealthScore,
    summary: r.summary,
    insights: r.insights?.slice(0, 2) || []
  }));
};

// ============================================
// PROMPT ENGINEERING
// ============================================

const generateAnnualPrompt = (annualData, userProfile, prevYearData, monthlyInsights, year) => {
  const cur = userProfile.currency || 'USD';
  const fmt = (n) => formatCurrency(typeof n === 'number' && !isNaN(n) ? n : 0, cur);

  const savingsRate = annualData.income > 0
    ? ((annualData.saving / annualData.income) * 100).toFixed(1)
    : '0.0';

  const topCats = annualData.topCategories.slice(0, 5)
    .map(c => `- ${c.category}: ${fmt(c.amount)} (${c.percentage}% of expenses)`)
    .join('\n');

  // Best and worst months
  const activeMonths = annualData.monthlyBreakdown.filter(m => m.income > 0 || m.expense > 0);
  const bestSavingMonth  = activeMonths.sort((a, b) => b.net - a.net)[0];
  const worstSavingMonth = activeMonths.sort((a, b) => a.net - b.net)[0];

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const yoySection = prevYearData ? `
Year-over-Year Comparison (vs ${year - 1}):
- Income change: ${prevYearData.income > 0 ? (((annualData.income - prevYearData.income) / prevYearData.income) * 100).toFixed(1) : 'N/A'}%
- Expense change: ${prevYearData.expense > 0 ? (((annualData.expense - prevYearData.expense) / prevYearData.expense) * 100).toFixed(1) : 'N/A'}%
- Saving change: ${prevYearData.saving > 0 ? (((annualData.saving - prevYearData.saving) / prevYearData.saving) * 100).toFixed(1) : 'N/A'}%` : 'Year-over-Year: No prior year data available.';

  const insightsSection = monthlyInsights.length > 0
    ? `\nKey Monthly Insights (from AI monthly reports):\n${monthlyInsights.map(r =>
        `- ${monthNames[r.month - 1]}: Score ${r.score || 'N/A'} — ${r.summary || ''}`
      ).join('\n')}`
    : '';

  return `You are Budget Sathi, a professional financial advisor AI. Analyze the user's FULL YEAR finances for ${year} and generate an annual summary report.

## USER PROFILE
- Name: ${userProfile.name}
- Currency: ${cur}
- Report Year: ${year}
- Monthly Income Goal: ${fmt(userProfile.monthlyIncomeGoal)} (Annual: ${fmt(userProfile.monthlyIncomeGoal * 12)})
- Monthly Expense Budget: ${fmt(userProfile.monthlyExpenseBudget)} (Annual: ${fmt(userProfile.monthlyExpenseBudget * 12)})
- Monthly Saving Goal: ${fmt(userProfile.monthlySavingGoal)} (Annual: ${fmt(userProfile.monthlySavingGoal * 12)})

## ANNUAL FINANCIAL DATA
Income:  ${fmt(annualData.income)}
Expenses: ${fmt(annualData.expense)}
Savings: ${fmt(annualData.saving)}
Net Cash Flow: ${fmt(annualData.net)} (${annualData.net >= 0 ? 'positive' : 'negative'})
Savings Rate: ${savingsRate}% of annual income
Total Transactions: ${annualData.totalTransactions}

Best month (net): ${bestSavingMonth ? monthNames[bestSavingMonth.month - 1] + ' (' + fmt(bestSavingMonth.net) + ')' : 'N/A'}
Worst month (net): ${worstSavingMonth ? monthNames[worstSavingMonth.month - 1] + ' (' + fmt(worstSavingMonth.net) + ')' : 'N/A'}

Top Expense Categories (full year):
${topCats || '- No expense data'}
${yoySection}
${insightsSection}

## INSTRUCTIONS
Respond ONLY with a JSON object. No markdown, no text outside JSON.
Use ${cur} currency for ALL monetary values.
Focus on ANNUAL patterns, trends, and year-level recommendations — not individual months.

JSON SCHEMA:
{
  "financialHealthScore": <integer 0-100>,
  "summary": "<2-3 sentences: overall year performance, key achievement or concern, net position>",
  "insights": ["<annual insight>", "<annual insight>", "<annual insight>"],
  "suggestions": [
    { "category": "<string>", "action": "<specific annual improvement advice>", "potentialSavings": <number>, "priority": "<high|medium|low>" }
  ],
  "spendingAnalysis": {
    "topCategories": [{ "category": "<string>", "amount": <number>, "percentage": <number> }],
    "yearOverYearChange": <number or null>,
    "annualBudgetAdherence": <number 0-100>
  }
}

Score: 80-100 Excellent year | 60-79 Good year | 40-59 Fair | below 40 Needs significant improvement`;
};

// ============================================
// VALIDATION
// ============================================

const validateAnnualReport = (data) => {
  const report = {
    financialHealthScore: Math.min(100, Math.max(0, parseInt(data.financialHealthScore) || 50)),
    summary: typeof data.summary === 'string' ? data.summary.substring(0, 1500) : 'Annual financial analysis completed.',
    insights: Array.isArray(data.insights)
      ? data.insights.filter(i => typeof i === 'string').slice(0, 10)
      : [],
    suggestions: [],
    spendingAnalysis: { topCategories: [], yearOverYearChange: null, annualBudgetAdherence: 0 }
  };

  if (Array.isArray(data.suggestions)) {
    report.suggestions = data.suggestions.slice(0, 10).map(s => ({
      category:        typeof s.category === 'string' ? s.category.substring(0, 100) : 'general',
      action:          typeof s.action === 'string' ? s.action.substring(0, 1000) : 'Review your annual spending.',
      potentialSavings: Math.max(0, parseFloat(s.potentialSavings) || 0),
      priority:        ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium'
    }));
  }

  if (data.spendingAnalysis && typeof data.spendingAnalysis === 'object') {
    const sa = data.spendingAnalysis;
    if (Array.isArray(sa.topCategories)) {
      report.spendingAnalysis.topCategories = sa.topCategories.slice(0, 8).map(c => ({
        category:   typeof c.category === 'string' ? c.category.substring(0, 100) : 'unknown',
        amount:     Math.max(0, parseFloat(c.amount) || 0),
        percentage: Math.min(100, Math.max(0, parseFloat(c.percentage) || 0))
      }));
    }
    report.spendingAnalysis.yearOverYearChange  = sa.yearOverYearChange != null ? parseFloat(sa.yearOverYearChange) : null;
    report.spendingAnalysis.annualBudgetAdherence = Math.min(100, Math.max(0, parseFloat(sa.annualBudgetAdherence) || 0));
  }

  return report;
};

// ============================================
// FALLBACK
// ============================================

const generateFallbackAnnualReport = (annualData, userProfile, year) => {
  const { income, expense, saving, net, topCategories } = annualData;
  const cur   = userProfile.currency || 'USD';
  const fmt   = (n) => formatCurrency(n, cur);
  const score = Math.min(100, Math.max(0, Math.round((saving / Math.max(income, 1)) * 100) + 50));

  const insights    = [];
  const suggestions = [];

  if (net < 0) {
    insights.push(`You spent ${fmt(Math.abs(net))} more than you earned in ${year}.`);
    suggestions.push({ category: 'general', action: 'Build a strict monthly budget for next year.', potentialSavings: Math.abs(net), priority: 'high' });
  } else {
    insights.push(`You maintained a positive net cash flow of ${fmt(net)} in ${year}.`);
  }

  const annualSavingGoal = userProfile.monthlySavingGoal * 12;
  if (saving < annualSavingGoal && annualSavingGoal > 0) {
    insights.push(`You saved ${fmt(saving)} against an annual goal of ${fmt(annualSavingGoal)}.`);
    suggestions.push({ category: 'saving', action: 'Automate monthly savings transfers to close the gap next year.', potentialSavings: annualSavingGoal - saving, priority: 'medium' });
  } else if (saving >= annualSavingGoal && annualSavingGoal > 0) {
    insights.push(`You met your annual saving goal of ${fmt(annualSavingGoal)}.`);
  }

  if (topCategories.length > 0) {
    insights.push(`Your top expense category was ${topCategories[0].category} at ${fmt(topCategories[0].amount)}.`);
    suggestions.push({ category: topCategories[0].category, action: `Review ${topCategories[0].category} spending — consider setting a monthly cap.`, potentialSavings: topCategories[0].amount * 0.1, priority: 'low' });
  }

  return {
    financialHealthScore: score,
    summary: net >= 0
      ? `You had a financially positive ${year}, ending with ${fmt(net)} in net cash flow across all transactions.`
      : `Your ${year} ended with a deficit of ${fmt(Math.abs(net))}. Tightening your budget in key categories is recommended for next year.`,
    insights: insights.length ? insights : ['Keep tracking your expenses regularly.'],
    suggestions: suggestions.length ? suggestions : [{ category: 'general', action: 'Continue monitoring your finances monthly.', potentialSavings: 0, priority: 'low' }]
  };
};

// ============================================
// MAIN EXPORT
// ============================================

export const generateAnnualReport = async (userId, year) => {
  const redis    = getRedis();
  const cacheKey = `annual_report:${userId}:${year}`;

  // Check Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Check DB — return if generated within last 24 hours
  const existingReport = await AnnualReport.findOne({ user: userId, year: parseInt(year) });
  if (existingReport && existingReport.generatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    await redis.setex(cacheKey, 3600, JSON.stringify(existingReport));
    return existingReport;
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Aggregate all transaction data for the year
  const annualData = await getAnnualData(userId, year);
  if (annualData.totalTransactions === 0) {
    throw Object.assign(new Error(`No transactions found for ${year}`), { statusCode: 404 });
  }

  // Get previous year totals for YoY comparison
  const prevYearTotals = await getPreviousYearTotals(userId, year);

  // Build YoY object for storage
  let yearOverYear = null;
  if (prevYearTotals) {
    yearOverYear = {
      incomeChange:  prevYearTotals.income  > 0 ? parseFloat(((annualData.income  - prevYearTotals.income)  / prevYearTotals.income  * 100).toFixed(2)) : null,
      expenseChange: prevYearTotals.expense > 0 ? parseFloat(((annualData.expense - prevYearTotals.expense) / prevYearTotals.expense * 100).toFixed(2)) : null,
      savingChange:  prevYearTotals.saving  > 0 ? parseFloat(((annualData.saving  - prevYearTotals.saving)  / prevYearTotals.saving  * 100).toFixed(2)) : null
    };
  }

  // Pull existing monthly AI insights as context (hybrid)
  const monthlyInsights = await getExistingMonthlyInsights(userId, year);

  let reportData;
  try {
    const prompt = generateAnnualPrompt(annualData, user, prevYearTotals, monthlyInsights, parseInt(year));

    const chatResponse = await mistral.chat.complete({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 2500,
    });

    const rawText = chatResponse.choices?.[0]?.message?.content?.trim() || '';
    if (!rawText) throw new Error('Empty response from Mistral');

    reportData = validateAnnualReport(JSON.parse(rawText));
  } catch (aiError) {
    console.warn('Annual AI generation failed, using fallback:', aiError.message);
    reportData = generateFallbackAnnualReport(annualData, user, year);
  }

  // Upsert into DB
  const report = await AnnualReport.findOneAndUpdate(
    { user: userId, year: parseInt(year) },
    {
      ...reportData,
      user:             userId,
      year:             parseInt(year),
      totals:           { income: annualData.income, expense: annualData.expense, saving: annualData.saving, net: annualData.net },
      monthlyBreakdown: annualData.monthlyBreakdown,
      topCategories:    annualData.topCategories,
      yearOverYear,
      generatedAt:      new Date()
    },
    { upsert: true, new: true }
  );

  await redis.setex(cacheKey, 3600, JSON.stringify(report));
  return report;
};
