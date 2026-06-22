import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { getRedis } from '../config/redis.js';

const getCacheKey = (userId, month, year) => `txns:${userId}:${year}:${month}`;
const getSummaryKey = (userId, month, year) => `summary:${userId}:${year}:${month}`;

const invalidateMonthCaches = async (redis, userId, month, year) => {
  await redis.del(getCacheKey(userId, month, year));
  await redis.del(getSummaryKey(userId, month, year));
  await redis.del(`running_balance:${userId}`);
};

export const createTransaction = async (userId, data) => {
  const transactionData = { ...data, user: userId };
  if (transactionData.date && typeof transactionData.date === 'string') {
    transactionData.date = new Date(transactionData.date);
  }
  const transaction = await Transaction.create(transactionData);

  const redis = getRedis();
  await invalidateMonthCaches(redis, userId, transaction.month, transaction.year);

  return transaction;
};

export const getTransactions = async (userId, filters = {}) => {
  const { month, year, type, page = 1, limit = 50, _t } = filters;
  const query = { user: userId };

  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);
  if (type) query.type = type;

  const useCache = month && year && !type && !_t;

  if (useCache) {
    const redis = getRedis();
    const cacheKey = getCacheKey(userId, month, year);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  if (month && year && !type) {
    const redis = getRedis();
    await redis.setex(getCacheKey(userId, month, year), 300, JSON.stringify(transactions));
  }

  return transactions;
};

export const getMonthlySummary = async (userId, month, year, _t) => {
  const redis = getRedis();
  const cacheKey = getSummaryKey(userId, month, year);

  if (!_t) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const summary = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        month: parseInt(month),
        year: parseInt(year)
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    income:  summary.find(s => s._id === 'income')?.total  || 0,
    expense: summary.find(s => s._id === 'expense')?.total || 0,
    saving:  summary.find(s => s._id === 'saving')?.total  || 0,
    net: 0
  };
  result.net = result.income - result.expense - result.saving;

  await redis.setex(cacheKey, 300, JSON.stringify(result));
  return result;
};

export const updateTransaction = async (userId, transactionId, data) => {
  if (data.date && typeof data.date === 'string') {
    data.date = new Date(data.date);
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: transactionId, user: userId },
    data,
    { returnDocument: 'after', runValidators: true }
  );

  if (!transaction) throw new Error('Transaction not found');

  const redis = getRedis();
  await invalidateMonthCaches(redis, userId, transaction.month, transaction.year);

  return transaction;
};

export const deleteTransaction = async (userId, transactionId) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: transactionId,
    user: userId
  });

  if (!transaction) throw new Error('Transaction not found');

  const redis = getRedis();
  await invalidateMonthCaches(redis, userId, transaction.month, transaction.year);

  return transaction;
};

export const getRunningBalance = async (userId, initialBalance = 0) => {
  const redis = getRedis();
  const cacheKey = `running_balance:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const income  = result.find(r => r._id === 'income')?.total  || 0;
  const expense = result.find(r => r._id === 'expense')?.total || 0;
  const saving  = result.find(r => r._id === 'saving')?.total  || 0;

  const runningBalance = initialBalance + income - expense - saving;

  await redis.setex(cacheKey, 300, JSON.stringify(runningBalance));
  return runningBalance;
};

export const getSpendingTrends = async (userId, months = 6) => {
  const redis = getRedis();
  const cacheKey = `trends:${userId}:${months}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Build list of last N months (including current)
  const now = new Date();
  const periods = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        $or: periods.map(p => ({ month: p.month, year: p.year }))
      }
    },
    {
      $group: {
        _id: { year: '$year', month: '$month', type: '$type' },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Shape into [ { label, income, expense, saving, net }, ... ]
  const trends = periods.map(({ month, year }) => {
    const label   = new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
    const income  = result.find(r => r._id.year === year && r._id.month === month && r._id.type === 'income')?.total  || 0;
    const expense = result.find(r => r._id.year === year && r._id.month === month && r._id.type === 'expense')?.total || 0;
    const saving  = result.find(r => r._id.year === year && r._id.month === month && r._id.type === 'saving')?.total  || 0;
    return { month, year, label, income, expense, saving, net: income - expense - saving };
  });

  await redis.setex(cacheKey, 300, JSON.stringify(trends));
  return trends;
};
