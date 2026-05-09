import express from 'express';
import { validate, authValidators } from '../middleware/validator.js';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { setAuthCookies } from '../utils/authCookies.js';

const router = express.Router();

// REGISTER
router.post('/register', validate(authValidators.register), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.register(req.body);
    setAuthCookies(res, tokens);
    res.status(201).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
});

// LOGIN
router.post('/login', validate(authValidators.login), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.login(req.body);
    setAuthCookies(res, tokens);
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
});

// REFRESH (CSRF-protected)
// Client must send X-CSRF-Token header with the value from the csrfToken cookie.
router.post('/refresh', async (req, res, next) => {
  try {
    const csrfHeader = req.get('x-csrf-token');
    const csrfCookie = req.cookies?.csrfToken;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({
      success: true,
      data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
    });
  } catch (error) {
    next(error);
  }
});

// LOGOUT
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const accessToken = req.token || req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(accessToken, refreshToken);
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// LOGOUT ALL
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await authService.logoutAll(req.user._id);
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    next(error);
  }
});

// GET ME
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
});

export default router;