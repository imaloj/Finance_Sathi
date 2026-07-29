import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { setActivityPin, verifyActivityPin, resetActivityPin } from '../services/authService.js';
import ActivityLog from '../models/ActivityLog.js';
import { logActivity, reqMeta } from '../utils/activityLogger.js';

const router = express.Router();
router.use(authenticate);

// Reset PIN using account password
router.post('/reset-pin', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
    await resetActivityPin(req.user._id, password);
    res.status(200).json({ success: true, message: 'PIN reset. Set a new one.' });
  } catch (error) { next(error); }
});

// Check if PIN is set
router.get('/pin-status', async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: { hasPin: req.user.hasActivityLogPin } });
  } catch (error) { next(error); }
});

// Set or reset PIN (requires account password proof via existing auth session)
router.post('/set-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    await setActivityPin(req.user._id, pin);
    logActivity(req.user._id, 'activity_pin_set', 'Activity log PIN was set', reqMeta(req));
    res.status(200).json({ success: true, message: 'PIN set successfully' });
  } catch (error) { next(error); }
});

// Verify PIN and return activity log
router.post('/verify', async (req, res, next) => {
  try {
    const { pin } = req.body;
    await verifyActivityPin(req.user._id, pin);
    // Log the access itself
    logActivity(req.user._id, 'activity_log_accessed', 'Activity log was accessed', reqMeta(req));
    // Fetch last 100 events
    const logs = await ActivityLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.status(200).json({ success: true, data: logs });
  } catch (error) { next(error); }
});

export default router;
