import ActivityLog from '../models/ActivityLog.js';
import { logger } from './logger.js';
import { parseUserAgent } from './parseUserAgent.js';

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


export const reqMeta = (req) => ({
  ip: req.ip || req.headers['x-forwarded-for'] || '',
  userAgent: parseUserAgent(req.headers['user-agent'] || ''),
});
