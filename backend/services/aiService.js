import mongoose from 'mongoose';
import { Mistral } from '@mistralai/mistralai';
import Transaction from '../models/Transaction.js';
import AIReport from '../models/AIReport.js';
import User from '../models/User.js';
import { getRedis } from '../config/redis.js';
import { formatCurrency } from '../utils/currency.js';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const MODEL = 'mistral-small-latest';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getMonthlyData = async (userId, month, year) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        month: parseInt(month),
        year: parseInt(year)
      }
    },
    {
      $facet: {
        totals: [
          { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ],
        categories: [
          { $match: { type: 'expense' } },
          { $group: { _id: '$category', amount: { $sum: '$amount' } } },
          { $sort: { amount: -1 } },
          { $limit: 5 }
        ],
        allTransactions: [{ $count: 'total' }]
      }
    }
  ]);

  const data = result[0];
  const income  = data.totals.find(t => t._id === 'income')?.total  || 0;
  const expense = data.totals.find(t => t._id === 'expense')?.total || 0;
  const saving  = data.totals.find(t => t._id === 'saving')?.total  || 0;
  const totalExpense = expense || 1;

  return {
    income, expense, saving,
    net: income - expense - saving,
    topCategories: data.categories.map(c => ({
      category: c._id,
      amount: c.amount,
      percentage: Math.round((c.amount / totalExpense) * 100)
    })),
    totalTransactions: data.allTransactions[0]?.total || 0
  };
};

const getPreviousMonthData = async (userId, month, year) => {
  let prevMonth = parseInt(month) - 1;
  let prevYear  = parseInt(year);
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

  const current  = await getMonthlyData(userId, month, year);
  const previous = await getMonthlyData(userId, prevMonth, prevYear);
  if (previous.totalTransactions === 0) return null;

  return {
    incomeChange:  previous.income  ? ((current.income  - previous.income)  / previous.income  * 100).toFixed(2) : 0,
    expenseChange: previous.expense ? ((current.expense - previous.expense) / previous.expense * 100).toFixed(2) : 0
  };
};

// ============================================
// PROMPT ENGINEERING
// ============================================

const generatePrompt = (monthlyData, userProfile, previousMonthData) => {
  const cur = userProfile.currency || 'USD';
  const fmt = (n) => formatCurrency(typeof n === 'number' && !isNaN(n) ? n : 0, cur);

  const cats = monthlyData.topCategories.slice(0, 5)
    .map(c => `- ${c.category}: ${fmt(c.amount)} (${c.percentage}%)`)
    .join('\n');

  const savingsRate = monthlyData.income > 0
    ? ((monthlyData.saving / monthlyData.income) * 100).toFixed(1)
    : '0.0';

  const incomeChangeLine  = previousMonthData
    ? `Income changed by ${previousMonthData.incomeChange}% compared to previous month.`
    : 'No previous month income data.';
  const expenseChangeLine = previousMonthData
    ? `Expenses changed by ${previousMonthData.expenseChange}% compared to previous month.`
    : 'No previous month expense data.';

  return `You are Budget Sathi, a professional financial advisor AI. Analyze the user's monthly finances and generate a structured report.

## USER PROFILE
- Name: ${userProfile.name}
- Currency: ${cur}
- Report Period: ${monthlyData.month}/${monthlyData.year}
- Monthly Income Goal: ${fmt(userProfile.monthlyIncomeGoal)}
- Monthly Expense Budget: ${fmt(userProfile.monthlyExpenseBudget)}
- Monthly Saving Goal: ${fmt(userProfile.monthlySavingGoal)}

## FINANCIAL DATA
Income:
- Current Month: ${fmt(monthlyData.income)}
- Previous Month: ${previousMonthData ? fmt(monthlyData.income / (1 + parseFloat(previousMonthData.incomeChange) / 100)) : 'N/A'}
- ${incomeChangeLine}

Expenses:
- Current Month: ${fmt(monthlyData.expense)}
- Previous Month: ${previousMonthData ? fmt(monthlyData.expense / (1 + parseFloat(previousMonthData.expenseChange) / 100)) : 'N/A'}
- ${expenseChangeLine}

Savings:
- Current Month: ${fmt(monthlyData.saving)}
- Savings Rate: ${savingsRate}% of income
- Net Cash Flow: ${fmt(monthlyData.net)} (${monthlyData.net >= 0 ? 'positive' : 'negative'})
- Remaining Balance: ${fmt(monthlyData.net)}

Expense Breakdown (Top Categories):
${cats || '- No expense data available'}

## INSTRUCTIONS
Respond ONLY with a JSON object. No markdown, no text outside the JSON.
Use ${cur} currency for ALL monetary values and suggestions.

JSON SCHEMA:
{
  "financialHealthScore": <integer 0-100>,
  "summary": "<1-2 sentences: cash flow status, remaining balance, overall condition>",
  "insights": ["<bullet highlight>", "<bullet highlight>"],
  "suggestions": [
    { "category": "<string>", "action": "<specific practical advice>", "potentialSavings": <number>, "priority": "<high|medium|low>" }
  ],
  "spendingAnalysis": {
    "topCategories": [{ "category": "<string>", "amount": <number>, "percentage": <number> }],
    "monthOverMonthChange": <number>,
    "budgetAdherence": <number 0-100>
  }
}

Priority: HIGH = negative cash flow or >20% over budget | MEDIUM = below savings goal or over budget | LOW = general tips
Score: 80-100 Excellent | 60-79 Good | 40-59 Fair | below 40 Needs Attention`;
};

// ============================================
// VALIDATION
// ============================================

const validateAIReport = (data) => {
  const report = {
    financialHealthScore: Math.min(100, Math.max(0, parseInt(data.financialHealthScore) || 50)),
    summary: typeof data.summary === 'string' ? data.summary.substring(0, 1000) : 'Financial analysis completed.',
    insights: Array.isArray(data.insights) ? data.insights.filter(i => typeof i === 'string').slice(0, 10) : [],
    suggestions: [],
    spendingAnalysis: { topCategories: [], monthOverMonthChange: 0, budgetAdherence: 0 }
  };

  if (Array.isArray(data.suggestions)) {
    report.suggestions = data.suggestions.slice(0, 20).map(s => ({
      category: typeof s.category === 'string' ? s.category.substring(0, 100) : 'general',
      action: typeof s.action === 'string' ? s.action.substring(0, 1000) : 'Review your spending.',
      potentialSavings: Math.max(0, parseFloat(s.potentialSavings) || 0),
      priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium'
    }));
  }

  if (data.spendingAnalysis && typeof data.spendingAnalysis === 'object') {
    const sa = data.spendingAnalysis;
    if (Array.isArray(sa.topCategories)) {
      report.spendingAnalysis.topCategories = sa.topCategories.slice(0, 10).map(c => ({
        category: typeof c.category === 'string' ? c.category.substring(0, 100) : 'unknown',
        amount: Math.max(0, parseFloat(c.amount) || 0),
        percentage: Math.min(100, Math.max(0, parseFloat(c.percentage) || 0))
      }));
    }
    report.spendingAnalysis.monthOverMonthChange = parseFloat(sa.monthOverMonthChange) || 0;
    report.spendingAnalysis.budgetAdherence = Math.min(100, Math.max(0, parseFloat(sa.budgetAdherence) || 0));
  }

  return report;
};

// ============================================
// FALLBACK: Rule-based report if AI fails
// ============================================

const generateFallbackReport = (monthlyData, userProfile) => {
  const { income, expense, saving, net, topCategories } = monthlyData;
  const cur  = userProfile.currency || 'USD';
  const fmt  = (n) => formatCurrency(n, cur);
  const score = Math.min(100, Math.max(0, Math.round((saving / Math.max(income, 1)) * 100) + 50));

  const insights    = [];
  const suggestions = [];

  if (net < 0) {
    insights.push('You are spending more than you earn this month.');
    suggestions.push({ category: 'general', action: 'Reduce discretionary spending immediately.', potentialSavings: Math.abs(net), priority: 'high' });
  } else {
    insights.push('Your cash flow is positive this month.');
  }

  if (saving < userProfile.monthlySavingGoal) {
    insights.push(`You saved ${fmt(saving)} against a goal of ${fmt(userProfile.monthlySavingGoal)}.`);
    suggestions.push({ category: 'saving', action: 'Automate transfers to your savings account on salary day.', potentialSavings: userProfile.monthlySavingGoal - saving, priority: 'medium' });
  }

  if (expense > userProfile.monthlyExpenseBudget && userProfile.monthlyExpenseBudget > 0) {
    insights.push(`You exceeded your expense budget by ${fmt(expense - userProfile.monthlyExpenseBudget)}.`);
    suggestions.push({ category: 'budget', action: 'Review your top spending categories and set category limits.', potentialSavings: expense - userProfile.monthlyExpenseBudget, priority: 'high' });
  }

  return {
    financialHealthScore: score,
    summary: net >= 0
      ? `You maintained positive cash flow with ${fmt(net)} remaining after expenses and savings.`
      : `You overspent by ${fmt(Math.abs(net))} this month. Immediate budget correction is recommended.`,
    insights: insights.length ? insights : ['Keep tracking your expenses regularly.'],
    suggestions: suggestions.length ? suggestions : [{ category: 'general', action: 'Continue monitoring your finances.', potentialSavings: 0, priority: 'low' }],
    spendingAnalysis: {
      topCategories: topCategories.slice(0, 3),
      monthOverMonthChange: 0,
      budgetAdherence: userProfile.monthlyExpenseBudget > 0
        ? Math.min(100, Math.round((expense / userProfile.monthlyExpenseBudget) * 100))
        : 100
    }
  };
};

// ============================================
// MAIN EXPORT
// ============================================

export const generateMonthlyReport = async (userId, month, year) => {
  const redis    = getRedis();
  const cacheKey = `ai_report:${userId}:${year}:${month}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const existingReport = await AIReport.findOne({ user: userId, month, year });
  if (existingReport && existingReport.generatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    await redis.setex(cacheKey, 3600, JSON.stringify(existingReport));
    return existingReport;
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const currentMonthData = await getMonthlyData(userId, month, year);
  if (currentMonthData.totalTransactions === 0) throw new Error('No transactions found for this month');

  let reportData;
  try {
    const prevMonthData = await getPreviousMonthData(userId, month, year);
    const prompt = generatePrompt(currentMonthData, user, prevMonthData);

    const chatResponse = await mistral.chat.complete({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 2000,
    });

    const rawText = chatResponse.choices?.[0]?.message?.content?.trim() || '';
    if (!rawText) throw new Error('Empty response from Mistral');

    reportData = validateAIReport(JSON.parse(rawText));
  } catch (aiError) {
    console.warn('AI generation failed, using fallback:', aiError.message);
    reportData = generateFallbackReport(currentMonthData, user);
  }

  const report = await AIReport.findOneAndUpdate(
    { user: userId, month, year },
    { ...reportData, user: userId, month, year, generatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  await redis.setex(cacheKey, 3600, JSON.stringify(report));
  return report;
};
