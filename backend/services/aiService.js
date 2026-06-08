import mongoose from 'mongoose';
import { Mistral } from '@mistralai/mistralai';
import Transaction from '../models/Transaction.js';
import AIReport from '../models/AIReport.js';
import User from '../models/User.js';
import { getRedis } from '../config/redis.js';



const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const MODEL = 'mistral-small-latest'; // Free tier eligible
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
          { 
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ],
        categories: [
          { $match: { type: 'expense' } },
          { 
            $group: {
              _id: '$category',
              amount: { $sum: '$amount' }
            }
          },
          { $sort: { amount: -1 } },
          { $limit: 5 }
        ],
        allTransactions: [
          { $count: 'total' }
        ]
      }
    }
  ]);

  const data = result[0];
  const income = data.totals.find(t => t._id === 'income')?.total || 0;
  const expense = data.totals.find(t => t._id === 'expense')?.total || 0;
  const saving = data.totals.find(t => t._id === 'saving')?.total || 0;

  const totalExpense = expense || 1;
  const topCategories = data.categories.map(c => ({
    category: c._id,
    amount: c.amount,
    percentage: Math.round((c.amount / totalExpense) * 100)
  }));

  return {
    income,
    expense,
    saving,
    net: income - expense - saving,
    topCategories,
    totalTransactions: data.allTransactions[0]?.total || 0
  };
};

const getPreviousMonthData = async (userId, month, year) => {
  let prevMonth = parseInt(month) - 1;
  let prevYear = parseInt(year);
  if (prevMonth === 0) { 
    prevMonth = 12; 
    prevYear -= 1; 
  }

  const current = await getMonthlyData(userId, month, year);
  const previous = await getMonthlyData(userId, prevMonth, prevYear);

  if (previous.totalTransactions === 0) return null;

  return {
    incomeChange: previous.income ? ((current.income - previous.income) / previous.income * 100).toFixed(2) : 0,
    expenseChange: previous.expense ? ((current.expense - previous.expense) / previous.expense * 100).toFixed(2) : 0
  };
};

// ============================================
// PROMPT ENGINEERING
// ============================================

const generatePrompt = (monthlyData, userProfile, previousMonthData) => {
  const fmt = (n) => typeof n === 'number' && !isNaN(n) ? n.toFixed(2) : '0.00';
  
  const cats = monthlyData.topCategories.slice(0, 5).map(c => 
    `- ${c.category}: ₹${fmt(c.amount)} (${c.percentage}%)`
  ).join('\n');

  return `You are Budget Sathi, a professional Indian financial advisor. Analyze the user's monthly finances and provide structured advice.

## USER PROFILE
- Name: ${userProfile.name}
- Currency: ${userProfile.currency}
- Monthly Income Goal: ₹${fmt(userProfile.monthlyIncomeGoal)}
- Monthly Expense Budget: ₹${fmt(userProfile.monthlyExpenseBudget)}
- Monthly Saving Goal: ₹${fmt(userProfile.monthlySavingGoal)}

## CURRENT MONTH (${monthlyData.month}/${monthlyData.year})
- Total Income: ₹${fmt(monthlyData.income)}
- Total Expenses: ₹${fmt(monthlyData.expense)}
- Total Savings: ₹${fmt(monthlyData.saving)}
- Net Cash Flow: ₹${fmt(monthlyData.net)}
- Transactions Recorded: ${monthlyData.totalTransactions}

## TOP EXPENSE CATEGORIES
${cats || '- No expense data'}

${previousMonthData ? `## MONTH-OVER-MONTH CHANGE
- Income: ${previousMonthData.incomeChange}%
- Expenses: ${previousMonthData.expenseChange}%
` : ''}

## INSTRUCTIONS
Respond with a JSON object matching this exact schema:
{
  "financialHealthScore": <integer 0-100>,
  "summary": "<2-3 sentence overview>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "suggestions": [
    {
      "category": "<category name or 'general'>",
      "action": "<specific actionable advice>",
      "potentialSavings": <number>,
      "priority": "<high|medium|low>"
    }
  ],
  "spendingAnalysis": {
    "topCategories": [
      {"category": "<name>", "amount": <number>, "percentage": <number>}
    ],
    "monthOverMonthChange": <number>,
    "budgetAdherence": <number 0-100>
  }
}

EXAMPLES FOR BETTER SUGGESTIONS:
[
  {"category": "dining_out", "action": "Switch to cooking 4 days/week, save ₹2,500/month", "potentialSavings": 2500, "priority": "high"},
  {"category": "subscriptions", "action": "Cancel unused services (Netflix, Amazon Prime)", "potentialSavings": 800, "priority": "medium"},
  {"category": "general", "action": "Start SIP in index funds (₹5k/month)", "potentialSavings": 0, "priority": "low"},
  {"category": "transport", "action": "Use public transport 3 days/week", "potentialSavings": 1500, "priority": "high"}
]

PRIORITY RULES:
- HIGH: Overspend >20% budget, negative net flow
- MEDIUM: Savings < goal, expense > budget
- LOW: General tips, positive trends

Indian context ONLY: PPF, NPS, EPF, SIPs, FDs, gold savings scheme, 6-month emergency fund.

Rules:
- financialHealthScore: 80+ excellent, 60-79 good, 40-59 fair, <40 needs attention
- potentialSavings realistic/non-negative
- Encouraging but honest
- JSON ONLY, no markdown/text outside JSON`;
};

const validateAIReport = (data) => {
  const report = {
    financialHealthScore: Math.min(100, Math.max(0, parseInt(data.financialHealthScore) || 50)),
    summary: typeof data.summary === 'string' ? data.summary.substring(0, 1000) : 'Financial analysis completed.',
    insights: Array.isArray(data.insights) ? data.insights.filter(i => typeof i === 'string').slice(0, 10) : [],
    suggestions: [],
    spendingAnalysis: {
      topCategories: [],
      monthOverMonthChange: 0,
      budgetAdherence: 0
    }
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
  const score = Math.min(100, Math.max(0, Math.round((saving / Math.max(income, 1)) * 100) + 50));
  
  const insights = [];
  const suggestions = [];
  
  if (net < 0) {
    insights.push('You are spending more than you earn this month.');
    suggestions.push({ category: 'general', action: 'Reduce discretionary spending immediately.', potentialSavings: Math.abs(net), priority: 'high' });
  } else {
    insights.push('Your cash flow is positive this month.');
  }
  
  if (saving < userProfile.monthlySavingGoal) {
    insights.push(`You saved Rs ${saving.toFixed(0)} against a goal of Rs ${userProfile.monthlySavingGoal.toFixed(0)}.`);
    suggestions.push({ category: 'saving', action: 'Automate transfers to your savings account on salary day.', potentialSavings: userProfile.monthlySavingGoal - saving, priority: 'medium' });
  }
  
  if (expense > userProfile.monthlyExpenseBudget && userProfile.monthlyExpenseBudget > 0) {
    insights.push(`You exceeded your expense budget by ₹${(expense - userProfile.monthlyExpenseBudget).toFixed(0)}.`);
    suggestions.push({ category: 'budget', action: 'Review your top spending categories and set category limits.', potentialSavings: expense - userProfile.monthlyExpenseBudget, priority: 'high' });
  }

  return {
    financialHealthScore: score,
    summary: net >= 0 
      ? `You maintained positive cash flow with ₹${net.toFixed(0)} remaining after expenses and savings.`
      : `You overspent by ₹${Math.abs(net).toFixed(0)} this month. Immediate budget correction is recommended.`,
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
  const redis = getRedis();
  const cacheKey = `ai_report:${userId}:${year}:${month}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Check if report already exists in DB (less than 24h old)
  const existingReport = await AIReport.findOne({ user: userId, month, year });
  if (existingReport && existingReport.generatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    await redis.setex(cacheKey, 3600, JSON.stringify(existingReport));
    return existingReport;
  }

  // Fetch user's financial data
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const currentMonthData = await getMonthlyData(userId, month, year);
  if (currentMonthData.totalTransactions === 0) {
    throw new Error('No transactions found for this month');
  }

  // Try AI first, fallback to rule-based if it fails
  let reportData;
  
  try {
    const prevMonthData = await getPreviousMonthData(userId, month, year);
    const prompt = generatePrompt(currentMonthData, user, prevMonthData);

    const chatResponse = await mistral.chat.complete({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' }, // ← Native JSON mode
      temperature: 0.3,
      maxTokens: 2000,
    });

    const rawText = chatResponse.choices?.[0]?.message?.content?.trim() || '';
    
    if (!rawText) throw new Error('Empty response from Mistral');
    
    const parsedData = JSON.parse(rawText);
    reportData = validateAIReport(parsedData);
    
  } catch (aiError) {
    console.warn('AI generation failed, using fallback:', aiError.message);
    reportData = generateFallbackReport(currentMonthData, user);
  }

  // Save to DB
  const report = await AIReport.findOneAndUpdate(
    { user: userId, month, year },
    { ...reportData, user: userId, month, year, generatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  await redis.setex(cacheKey, 3600, JSON.stringify(report));
  return report;
};