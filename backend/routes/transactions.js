import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, transactionValidators } from '../middleware/validator.js';
import * as transactionService from '../services/transactionService.js';

const router = express.Router();
router.use(authenticate);

router.post('/', validate(transactionValidators.create), async (req, res, next) => {
  try {
    const transaction = await transactionService.createTransaction(req.user._id, req.body);
    const populated= await transaction.populate('user','name currency');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
});

router.get('/', validate(transactionValidators.list), async (req, res, next) => {
  try {
    const transactions = await transactionService.getTransactions(req.user._id, req.query);
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
});

router.get('/summary/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const summary = await transactionService.getMonthlySummary(req.user._id, month, year, req.query._t);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

router.get('/trends', async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const trends = await transactionService.getSpendingTrends(req.user._id, months);
    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
});

router.get('/running-balance', async (req, res, next) => {
  try {
    const user = req.user;
    const balance = await transactionService.getRunningBalance(user._id, user.initialBalance || 0);
    res.status(200).json({ success: true, data: { runningBalance: balance } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(transactionValidators.update), async (req, res, next) => {
  try {
    const transaction = await transactionService.updateTransaction(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;