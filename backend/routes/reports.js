import express from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { generateMonthlyReport } from '../services/aiService.js';
import { generatePDF } from '../services/pdfService.js';
import { generateAnnualReport } from '../services/annualReportService.js';
import { generateAnnualPDF } from '../services/annualPdfService.js';
import AIReport from '../models/AIReport.js';
import AnnualReport from '../models/AnnualReport.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { logActivity, reqMeta } from '../utils/activityLogger.js';

const yearValidator = [
  param('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year')
];

const router = express.Router();
router.use(authenticate);

// Generate AI report (JSON)
router.post('/generate/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const report = await generateMonthlyReport(req.user._id, parseInt(month), parseInt(year));
    logActivity(req.user._id, 'ai_report_generated',
      `AI report generated for ${month}/${year}`,
      reqMeta(req)
    );
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// Get existing report (JSON)
router.get('/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const report = await AIReport.findOne({ 
      user: req.user._id, 
      year: parseInt(year), 
      month: parseInt(month) 
    });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found. Generate one first.' });
    }
    
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// NEW: Download PDF report
router.get('/pdf/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const userId = req.user._id;
    
    // Get or generate AI report
    let report = await AIReport.findOne({ user: userId, year: parseInt(year), month: parseInt(month) });
    if (!report) {
      report = await generateMonthlyReport(userId, parseInt(month), parseInt(year));
    }
    
    // Get user details
    const user = await User.findById(userId);
    
    // Get monthly summary
    const summaryAgg = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), month: parseInt(month), year: parseInt(year) } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);
    
    const summary = {
      income: summaryAgg.find(s => s._id === 'income')?.total || 0,
      expense: summaryAgg.find(s => s._id === 'expense')?.total || 0,
      saving: summaryAgg.find(s => s._id === 'saving')?.total || 0
    };
    
    // Get previous month data for comparison
    let prevMonthData = null;
    try {
      const prevMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
      const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);
      const prevAgg = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), month: prevMonth, year: prevYear } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);
      prevMonthData = {
        income: prevAgg.find(s => s._id === 'income')?.total || 0,
        expense: prevAgg.find(s => s._id === 'expense')?.total || 0,
        saving: prevAgg.find(s => s._id === 'saving')?.total || 0,
        incomeChange: 0,
        expenseChange: 0
      };
      if (prevMonthData.income > 0) {
        prevMonthData.incomeChange = ((summary.income - prevMonthData.income) / prevMonthData.income * 100);
      }
      if (prevMonthData.expense > 0) {
        prevMonthData.expenseChange = ((summary.expense - prevMonthData.expense) / prevMonthData.expense * 100);
      }
    } catch (e) {
      console.log('Previous month data unavailable');
    }
    
    // Generate PDF
    const pdfBuffer = await generatePDF({
      user,
      report,
      summary,
      month: parseInt(month),
      year: parseInt(year),
      prevMonthData
    });
    
    // Set headers for download
    const filename = `BudgetSathi_Report_${year}_${month}_${user?.name?.replace(/\s+/g, '_') || 'User'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logActivity(req.user._id, 'report_downloaded',
      `PDF report downloaded for ${month}/${year}`,
      reqMeta(req)
    );

    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
});

// ── Annual report routes ──────────────────────────────────────────────────────

// Generate (or regenerate) annual AI report
router.post('/annual/:year', validate(yearValidator), async (req, res, next) => {
  try {
    const { year } = req.params;
    const report = await generateAnnualReport(req.user._id, parseInt(year));
    logActivity(req.user._id, 'ai_report_generated',
      `Annual AI report generated for ${year}`,
      reqMeta(req)
    );
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// Fetch existing annual report
router.get('/annual/:year', validate(yearValidator), async (req, res, next) => {
  try {
    const { year } = req.params;
    const report = await AnnualReport.findOne({
      user: req.user._id,
      year: parseInt(year)
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: `No annual report found for ${year}. Generate one first.`
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// Download annual PDF report
router.get('/annual/pdf/:year', validate(yearValidator), async (req, res, next) => {
  try {
    const { year } = req.params;
    const userId   = req.user._id;

    // Get or generate the annual report
    let report = await AnnualReport.findOne({ user: userId, year: parseInt(year) });
    if (!report) {
      report = await generateAnnualReport(userId, parseInt(year));
    }

    const user = await User.findById(userId);

    const pdfBuffer = await generateAnnualPDF({ user, report, year: parseInt(year) });

    const safeName = user?.name?.replace(/\s+/g, '_') || 'User';
    const filename = `BudgetSathi_Annual_Report_${year}_${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logActivity(req.user._id, 'report_downloaded',
      `Annual PDF report downloaded for ${year}`,
      reqMeta(req)
    );

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;