import ActivityLog from '../models/ActivityLog.js';
import { logger } from './logger.js';

/**
 * Log an activity event — non-blocking, never throws.
 * @param {string} userId
 * @param {string} event  — one of ActivityLog enum values
 * @param {string} description
 * @param {object} opts   — { metadata, ip, userAgent }
 */
export const logActivity = (userId, event, description = '', opts = {}) => {
  ActivityLog.create({
    user: userId,
    event,
    description,
    metadata: opts.metadata || {},
    ip: opts.ip || '',
    userAgent: opts.userAgent || '',
  }).catch(err => logger.error('ActivityLog write failed:', err.message));
};

/**
 * Helper to extract IP and UserAgent from an Express request.
 */
export const reqMeta = (req) => ({
  ip: req.ip || req.headers['x-forwarded-for'] || '',
  userAgent: req.headers['user-agent'] || '',
});
