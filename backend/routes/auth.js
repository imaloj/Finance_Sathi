import express from 'express';
import { validate, authValidators } from '../middleware/validator.js';
import * as authService from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { setAuthCookies, clearAuthCookies } from '../utils/authCookies.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';

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

// UPDATE PROFILE
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// VERIFY EMAIL
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    await authService.verifyEmail(token);
    // Redirect to frontend with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?verified=true`);
  } catch (error) {
    next(error);
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    await authService.forgotPassword(email);
    // Always 200 to prevent email enumeration
    res.status(200).json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// RESET PASSWORD
router.post('/reset-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    await authService.resetPassword(token, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
});

// CHANGE PASSWORD
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    // Clear cookies — user needs to log in again
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    next(error);
  }
});

export default router;