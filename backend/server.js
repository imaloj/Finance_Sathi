import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

import { securityHeaders, cspReportHandler } from './config/security.js';
import { connectDB } from './config/db.js';
import { connectRedis, getRedis } from './config/redis.js';
import { mongoSanitize } from './middleware/mongoSanitize.js';
import { generalLimiter, authLimiter, authSlowDown } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import activityLogRoutes from './routes/activityLog.js';
import recurringRoutes from './routes/recurring.js';
import { logger } from './utils/logger.js';
import { startCronJobs } from './services/cronService.js';

dotenv.config();
if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY.length < 10) {
  console.error('❌ MISTRAL_API_KEY is missing or invalid. Get one at https://console.mistral.ai/');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set

// Trust proxy for rate limiting behind reverse proxy (nginx, cloudflare, etc.)
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : 
  process.env.TRUST_PROXY?.startsWith('[') ? JSON.parse(process.env.TRUST_PROXY) : 
  process.env.TRUST_PROXY || 1);

// Security Middleware - MUST be early in the middleware chain
app.use(helmet(securityHeaders));

// CSP Report endpoint - receives CSP violations from browsers
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), cspReportHandler);

const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.1:5173',
    'http://127.0.1:3000'
     ].filter(Boolean);

// CORS: Must allow credentials for cookies
app.use(cors({
  origin: (origin, callback) =>{ // Allow requests with no origin (like mobile apps or curl)
     if(!origin) return callback(null, true);
     if(allowedOrigins.includes(origin)) return callback(null, true);
     callback(new Error(`CORS blocked: ${origin} not in whitelist`));
  },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization','X-Requested-With']
}));

app.use(generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize);

// Replace deprecated xss-clean with DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = DOMPurify.sanitize(obj[key], { ALLOWED_TAGS: [] });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// HTTPS enforcement in production (works correctly behind reverse proxies)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // When behind a proxy/load balancer, trust x-forwarded-proto
    const forwardedProto = req.header('x-forwarded-proto');
    const xForwardedSsl = req.header('x-forwarded-ssl');
    const isSecure =
      forwardedProto === 'https' ||
      xForwardedSsl === 'on' ||
      req.secure === true;

    if (!isSecure) {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }

    next();
  });
}


// Database Connections
connectDB();
connectRedis();
startCronJobs();

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Debug endpoint — restricted to localhost (prevents environment info disclosure)
app.get('/api/debug/health', (req, res) => {
  const ip = req.ip || '';
  const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.') || ip.startsWith('::ffff:0:');

  if (!isLocal && process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: getRedis()?.status || 'unknown'
  });
});

// Routes
app.use('/api/auth', authLimiter, authSlowDown, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/recurring', recurringRoutes);

// 404 & Error Handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Budget Sathi API running on port ${PORT}`);
  logger.info(`CSP Configuration: ${process.env.CSP_REPORT_ONLY === 'true' ? 'Report-Only Mode' : 'Enforcement Mode'}`);
});