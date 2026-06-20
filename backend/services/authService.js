import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { getRedis } from '../config/redis.js';
import { getCurrencyFromCountry } from '../utils/currency.js';
import { sendVerificationEmail, sendPasswordChangedEmail } from './emailService.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: userId }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const register = async ({ email, password, name, country }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
  }

  const currency = country ? getCurrencyFromCountry(country) : 'USD';
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    email, password, name,
    country: country || '',
    currency,
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  const tokens = generateTokens(user._id);

  const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  user.refreshTokens = [{
    token: refreshHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }];
  await user.save();

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(user.email, user.name, verificationToken).catch(err =>
    console.error('Failed to send verification email:', err.message)
  );

  return { user, tokens };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account deactivated'), { statusCode: 401 });
  }

  user.lastLogin = new Date();
  const tokens = generateTokens(user._id);
  const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  
  if (user.refreshTokens.length >= 5) {
    user.refreshTokens = user.refreshTokens.slice(-4);
  }
  user.refreshTokens.push({
    token: refreshHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await user.save();

  return { user, tokens };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw Object.assign(new Error('Refresh token required'), { statusCode: 401 });
  }
  if (typeof refreshToken !== 'string' || !refreshToken.includes('.')) {
    throw Object.assign(new Error('Invalid refresh token format'), { statusCode: 401 });
  }
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {

    throw Object.assign(
      new Error(err.message || 'Invalid or expired refresh token'), 
      { statusCode: 401, name: err.name }
    );
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const tokenEntry = user.refreshTokens.find(t => t.token === refreshHash);

  // Use getTime() for safe cross-timezone comparison
  if (!tokenEntry || tokenEntry.expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }
  const tokens = generateTokens(user._id);
  const newRefreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');

  tokenEntry.token = newRefreshHash;
  tokenEntry.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await user.save();
  return tokens;
};

export const logout = async (accessToken, refreshToken) => {
  const redis = getRedis();
  
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await redis.setex(`bl_${accessToken}`, ttl, 'true');
      }
    } catch (err) {
      // Handle invalid access token
    }
  }

  if (refreshToken) {
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await User.updateOne(
      { 'refreshTokens.token': refreshHash },
      { $pull: { refreshTokens: { token: refreshHash } } }
    );
  }

  return true;
};

export const logoutAll = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
  return true;
};

export const verifyEmail = async (token) => {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() }
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();
  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });

  user.password = newPassword;
  user.refreshTokens = []; // invalidate all sessions
  await user.save();

  // Notify user via email (non-blocking)
  sendPasswordChangedEmail(user.email, user.name).catch(err =>
    console.error('Failed to send password change email:', err.message)
  );

  return true;
};

export const updateProfile = async (userId, updates) => {
  const ALLOWED_FIELDS = ['name', 'country', 'language', 'monthlyIncomeGoal', 'monthlyExpenseBudget', 'monthlySavingGoal', 'initialBalance', 'monthlyReportEmail'];

  const sanitized = Object.fromEntries(
    Object.entries(updates).filter(([key]) => ALLOWED_FIELDS.includes(key))
  );

  // Auto-derive currency from country if country is being updated
  if (sanitized.country) {
    sanitized.currency = getCurrencyFromCountry(sanitized.country);
  }

  if (Object.keys(sanitized).length === 0) {
    throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: sanitized },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Invalidate running balance cache if initialBalance was updated
  if ('initialBalance' in sanitized || 'country' in sanitized) {
    const redis = getRedis();
    await redis.del(`running_balance:${userId}`);
  }

  return user;
};