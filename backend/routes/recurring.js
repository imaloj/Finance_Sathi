import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as recurringService from '../services/recurringService.js';
import * as transactionService from '../services/transactionService.js';

const router = express.Router();
router.use(authenticate);

// Get all recurring templates
router.get('/', async (req, res, next) => {
  try {
    const templates = await recurringService.getRecurringTemplates(req.user._id);
    res.status(200).json({ success: true, data: templates });
  } catch (error) { next(error); }
});

// Get due/overdue recurring (for Dashboard banner)
router.get('/due', async (req, res, next) => {
  try {
    const due = await recurringService.getDueRecurring(req.user._id);
    res.status(200).json({ success: true, data: due });
  } catch (error) { next(error); }
});

// Create recurring template
router.post('/', async (req, res, next) => {
  try {
    const template = await recurringService.createRecurring(req.user._id, req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) { next(error); }
});

// Update recurring template
router.put('/:id', async (req, res, next) => {
  try {
    const template = await recurringService.updateRecurring(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, data: template });
  } catch (error) { next(error); }
});

// Add now — create transaction + advance next due date
router.post('/:id/add', async (req, res, next) => {
  try {
    const template = await recurringService.getRecurringTemplates(req.user._id);
    const t = template.find(t => t._id.toString() === req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });

    // Create the actual transaction with today's date
    const today = new Date();
    const txnData = {
      type: t.type,
      amount: req.body.amount ?? t.amount, // allow override
      category: t.category,
      description: t.description,
      date: today,
    };
    const transaction = await transactionService.createTransaction(req.user._id, txnData);

    // Advance next due date
    await recurringService.markRecurringAdded(req.user._id, req.params.id);

    res.status(201).json({ success: true, data: transaction });
  } catch (error) { next(error); }
});

// Skip — just advance next due date
router.post('/:id/skip', async (req, res, next) => {
  try {
    await recurringService.skipRecurring(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Skipped' });
  } catch (error) { next(error); }
});

// Delete (deactivate) template
router.delete('/:id', async (req, res, next) => {
  try {
    await recurringService.deleteRecurring(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Recurring transaction removed' });
  } catch (error) { next(error); }
});

export default router;
