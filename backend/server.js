/**
 * Jai Bharat Backend Server
 * Node.js/Express API for subscription management:
 *   - GET  /api/subscription/status          – check trial / subscription status
 *   - POST /api/subscription/initiate-payment – mark payment initiated, return payment URL
 *   - POST /api/subscription/webhook          – receive payment confirmation from aienter.in
 *   - POST /api/subscription/verify-otp       – verify OTP and activate lifetime subscription
 */

'use strict';

require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const geoRouter = require('./routes/geo');
const jobsRouter = require('./routes/jobs');

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PAYMENT_BASE_URL = process.env.PAYMENT_URL || 'https://aienter.in/payments/jaibharatpay';
const PAYMENT_AMOUNT = parseFloat(process.env.PAYMENT_AMOUNT || '116.82');
const AIENTER_WEBHOOK_SECRET = process.env.AIENTER_WEBHOOK_SECRET || '';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@jaibharat.cloud';
const PORT = process.env.PORT || 8080;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// CORS allowed origins
// ---------------------------------------------------------------------------
const CORS_ORIGINS = [
  'https://app.jaibharat.cloud',
  'https://jaibharat.cloud',
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// ---------------------------------------------------------------------------
// Jobs Near Me routes
// ---------------------------------------------------------------------------
app.use('/api/geo', geoRouter);
app.use('/api/jobs', jobsRouter);

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
const { version } = require('./package.json');
app.get('/health', (_req, res) => {
  res.json({ ok: true, version, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

/** General subscription status check – 60 requests per minute per IP */
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Payment initiation – 10 requests per 15 minutes per IP */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please try again later.' },
});

/** OTP verification – 10 requests per 15 minutes per IP */
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP attempts. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Helper: ensure subscription row exists for a user (creates trial on first call)
// ---------------------------------------------------------------------------
async function ensureSubscription(userId) {
  const existing = await pool.query(
    'SELECT * FROM user_subscriptions WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const inserted = await pool.query(
    `INSERT INTO user_subscriptions (user_id)
     VALUES ($1)
     RETURNING *`,
    [userId]
  );
  return inserted.rows[0];
}

/** Webhook from aienter.in – 30 requests per minute per IP */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// GET /api/subscription/status
// ---------------------------------------------------------------------------
app.get('/api/subscription/status', statusLimiter, async (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const subscription = await ensureSubscription(userId);
    const now = new Date();

    // Lifetime subscription active
    if (subscription.subscription_active) {
      return res.json({
        hasAccess: true,
        reason: 'subscription_active',
        needsPayment: false,
        needsOTP: false,
      });
    }

    // Payment completed but OTP not yet verified
    if (subscription.payment_status === 'pending_otp') {
      return res.json({
        hasAccess: false,
        reason: 'pending_otp',
        needsPayment: false,
        needsOTP: true,
      });
    }

    // Trial still active
    const trialEndsAt = new Date(subscription.trial_ends_at);
    if (subscription.trial_active && now < trialEndsAt) {
      const hoursRemaining = (trialEndsAt - now) / (1000 * 60 * 60);
      return res.json({
        hasAccess: true,
        reason: 'trial_active',
        trialEndsAt: trialEndsAt.toISOString(),
        hoursRemaining: parseFloat(hoursRemaining.toFixed(2)),
        isTrialActive: true,
        needsPayment: false,
        needsOTP: false,
      });
    }

    // Trial expired
    return res.json({
      hasAccess: false,
      reason: 'trial_expired',
      needsPayment: true,
      needsOTP: false,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/subscription/initiate-payment
// ---------------------------------------------------------------------------
app.post('/api/subscription/initiate-payment', paymentLimiter, async (req, res) => {
  const { user_id: userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    await pool.query(
      `UPDATE user_subscriptions
       SET payment_status = 'pending_payment',
           payment_initiated_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    const paymentUrl = `${PAYMENT_BASE_URL}?user_id=${encodeURIComponent(userId)}&amount=${PAYMENT_AMOUNT}`;

    return res.json({ paymentUrl });
  } catch (error) {
    console.error('Initiate payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/subscription/webhook
// Receives payment confirmation from aienter.in
// ---------------------------------------------------------------------------
app.post('/api/subscription/webhook', webhookLimiter, async (req, res) => {
  const {
    user_id: userId,
    transaction_id: transactionId,
    amount,
    payment_method: paymentMethod,
    status,
    signature,
  } = req.body;

  // Verify webhook signature to prevent spoofing
  if (AIENTER_WEBHOOK_SECRET) {
    const payload = `${userId}:${transactionId}:${amount}:${status}`;
    const expectedSignature = crypto
      .createHmac('sha256', AIENTER_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn(`Webhook signature mismatch for transaction ${transactionId}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  if (status !== 'success') {
    return res.json({ received: true });
  }

  try {
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    await pool.query(
      `UPDATE user_subscriptions
       SET payment_status = 'pending_otp',
           payment_completed_at = NOW(),
           payment_transaction_id = $1,
           payment_method = $2,
           otp_code = $3,
           otp_generated_at = NOW(),
           otp_attempts = 0,
           updated_at = NOW()
       WHERE user_id = $4`,
      [transactionId, paymentMethod, otp, userId]
    );

    console.log(`\n========================================`);
    console.log(`OTP for User ${userId}: ${otp}`);
    console.log(`Transaction: ${transactionId}`);
    console.log(`Valid for ${OTP_EXPIRY_MINUTES} minutes`);
    console.log(`========================================\n`);

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/subscription/verify-otp
// ---------------------------------------------------------------------------
app.post('/api/subscription/verify-otp', otpLimiter, async (req, res) => {
  const { user_id: userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ error: 'user_id and otp are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const subscription = result.rows[0];

    if (subscription.payment_status !== 'pending_otp') {
      return res.status(400).json({ success: false, message: 'No pending OTP verification' });
    }

    if (subscription.otp_attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please contact support.',
      });
    }

    // Check OTP expiry
    const otpGeneratedAt = new Date(subscription.otp_generated_at);
    const now = new Date();
    const minutesElapsed = (now - otpGeneratedAt) / (1000 * 60);

    if (minutesElapsed > OTP_EXPIRY_MINUTES) {
      return res.status(400).json({
        success: false,
        message: `OTP has expired. Please contact support at ${SUPPORT_EMAIL}`,
      });
    }

    // Validate OTP
    if (subscription.otp_code !== String(otp)) {
      await pool.query(
        `UPDATE user_subscriptions
         SET otp_attempts = otp_attempts + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      const attemptsLeft = OTP_MAX_ATTEMPTS - (subscription.otp_attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
      });
    }

    // OTP is valid – activate subscription
    await pool.query(
      `UPDATE user_subscriptions
       SET payment_status = 'active',
           otp_verified_at = NOW(),
           subscription_starts_at = NOW(),
           subscription_active = true,
           trial_active = false,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    return res.json({ success: true, message: 'Subscription activated' });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Centralized error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Jai Bharat API server running on port ${PORT}`);
});

module.exports = app;
