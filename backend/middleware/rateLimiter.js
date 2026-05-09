import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { logger } from '../utils/logger.js';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({ success: false, message: 'Too many requests.' });
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Allow only 10 attempts per 15 minutes for auth routes
  skipSuccessfulRequests: true,
  standardHeaders: true,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' }
});

// Progressive delay for brute force protection
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: (hits) => hits * 500, // 500ms, 1000ms, 1500ms...
  maxDelayMs: 10000,
  skipSuccessfulRequests: true
});