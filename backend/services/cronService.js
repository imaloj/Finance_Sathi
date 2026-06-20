import cron from 'node-cron';
import User from '../models/User.js';
import { generateMonthlyReport } from './aiService.js';
import { generatePDF } from './pdfService.js';
import { sendMonthlyReportEmail } from './emailService.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Runs on the 1st of every month at 8:00 AM.
 * Generates last month's report for every verified user who opted in.
 */
export const startCronJobs = () => {
  cron.schedule('0 8 1 * *', async () => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    logger.info(`[CRON] Starting monthly report emails for ${prevMonth}/${prevYear}`);

    const users = await User.find({
      isEmailVerified: true,
      monthlyReportEmail: true,
      isActive: true
    }).lean();

    logger.info(`[CRON] Found ${users.length} users to email`);

    for (const user of users) {
      try {
        // Check if user has transactions for that month
        const txCount = await Transaction.countDocuments({
          user: new mongoose.Types.ObjectId(user._id),
          month: prevMonth,
          year: prevYear
        });

        if (txCount === 0) {
          logger.info(`[CRON] Skipping ${user.email} — no transactions for ${prevMonth}/${prevYear}`);
          continue;
        }

        // Generate AI report
        const report = await generateMonthlyReport(user._id, prevMonth, prevYear);

        // Get summary for PDF
        const summaryAgg = await Transaction.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(user._id), month: prevMonth, year: prevYear } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]);
        const summary = {
          income:  summaryAgg.find(s => s._id === 'income')?.total  || 0,
          expense: summaryAgg.find(s => s._id === 'expense')?.total || 0,
          saving:  summaryAgg.find(s => s._id === 'saving')?.total  || 0,
        };

        // Generate PDF
        const pdfBuffer = await generatePDF({ user, report, summary, month: prevMonth, year: prevYear, prevMonthData: null });

        // Send email
        await sendMonthlyReportEmail(user.email, user.name, prevMonth, prevYear, pdfBuffer);
        logger.info(`[CRON] Sent report to ${user.email}`);

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        logger.error(`[CRON] Failed for ${user.email}: ${err.message}`);
      }
    }

    logger.info(`[CRON] Monthly report job completed`);
  }, { timezone: 'Asia/Kathmandu' });

  logger.info('[CRON] Monthly report job scheduled (1st of month, 8:00 AM)');
};
