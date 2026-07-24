import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { logger } from '../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';

// General — all routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({ success: false, message: 'Too many requests. Please slow down.' });
  }
});

// Auth routes — stricter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' }
});

// Password reset — very strict
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts. Try again in 1 hour.' }
});

// Progressive delay for brute force protection
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: isProd ? 2 : 20,
  delayMs: (hits) => hits * 500,
  maxDelayMs: 10000,
  skipSuccessfulRequests: true
});
