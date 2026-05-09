import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { getRedis } from '../config/redis.js';

const getCacheKey = (userId, month, year) => `txns:${userId}:${year}:${month}`;
const getSummaryKey = (userId, month, year) => `summary:${userId}:${year}:${month}`;

// Helper: invalidate both caches atomically
const invalidateMonthCaches = async (redis, userId, month, year) => {
  await redis.del(getCacheKey(userId, month, year));
  await redis.del(getSummaryKey(userId, month, year));
};

export const createTransaction = async (userId, data) => {
  const transactionData = { ...data, user: userId };
  if(transactionData.date && typeof transactionData.date === 'string'){
    transactionData.date = new Date(transactionData.date);
  }
  const transaction = await Transaction.create(transactionData);
  
  // FIX: Invalidate BOTH transaction list AND summary caches
  const redis = getRedis();
  await invalidateMonthCaches(redis, userId, transaction.month, transaction.year);
  
  return transaction;
};

export const getTransactions = async (userId, filters = {}) => {
  const { month, year, type, page = 1, limit = 50, _t } = filters;  // ← _t added (unused but extracted)
  const query = { user: userId };
  
  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);
  if (type) query.type = type;

  // Skip cache if cache-buster present (forces fresh fetch)
  const useCache = month && year && !type && !_t;

  if (useCache) {
    const redis = getRedis();
    const cacheKey = getCacheKey(userId, month, year);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const transactions = await Transaction.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Cache monthly results
  if (month && year && !type) {
    const redis = getRedis();
    await redis.setex(
      getCacheKey(userId, month, year), 
      300, 
      JSON.stringify(transactions)
    );
  }

  return transactions;
};

export const getMonthlySummary = async (userId, month, year, _t) => {  // ← _t parameter added
  const redis = getRedis();
  const cacheKey = getSummaryKey(userId, month, year);
  
  // Skip cache if cache-buster present (forces fresh aggregation)
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
    income: summary.find(s => s._id === 'income')?.total || 0,
    expense: summary.find(s => s._id === 'expense')?.total || 0,
    saving: summary.find(s => s._id === 'saving')?.total || 0,
    net: 0
  };
  result.net = result.income - result.expense - result.saving;

  await redis.setex(cacheKey, 300, JSON.stringify(result));
  return result;
};

export const updateTransaction = async (userId, transactionId, data) => {
  if(data.date && typeof data.date === 'string') {
    data.date = new Date(data.date);
  }
  
  const transaction = await Transaction.findOneAndUpdate(
    { _id: transactionId, user: userId },
    data,
    { returnDocument:'after', runValidators: true }
  );

  if (!transaction) throw new Error('Transaction not found');

  // FIX: Invalidate both caches (was only doing txns before)
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

  // FIX: Invalidate both caches (was only doing txns before)
  const redis = getRedis();
  await invalidateMonthCaches(redis, userId, transaction.month, transaction.year);

  return transaction;
};