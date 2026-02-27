const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, full_name`,
      [email.toLowerCase(), password_hash, full_name, phone]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'Account created successfully',
      user_id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const subscription = await pool.query(
      'SELECT id FROM user_subscriptions WHERE user_id = $1',
      [user.id]
    );

    if (subscription.rows.length === 0) {
      const trialEndsAt = new Date();
      trialEndsAt.setHours(trialEndsAt.getHours() + 24);

      await pool.query(
        `INSERT INTO user_subscriptions (user_id, trial_ends_at, trial_active)
         VALUES ($1, $2, true)`,
        [user.id, trialEndsAt]
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful',
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// Rate limiters for phone OTP endpoints
const phoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many refresh requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const meLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: hash a value with sha256
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Helper: get user entitlements from subscription row
function buildEntitlements(subscription) {
  if (!subscription) return { hasAccess: false, reason: 'no_subscription' };
  const now = new Date();
  if (subscription.subscription_active) {
    return { hasAccess: true, reason: 'subscription_active' };
  }
  const trialEndsAt = new Date(subscription.trial_ends_at);
  if (subscription.trial_active && now < trialEndsAt) {
    return {
      hasAccess: true,
      reason: 'trial_active',
      trialEndsAt: trialEndsAt.toISOString(),
      hoursRemaining: parseFloat(((trialEndsAt - now) / (1000 * 60 * 60)).toFixed(2)),
    };
  }
  return { hasAccess: false, reason: 'trial_expired' };
}

// POST /auth/start – send OTP to phone
router.post('/start', phoneLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = sha256(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO phone_otps (phone, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (phone) DO UPDATE
         SET otp_hash = $2, expires_at = $3, attempts = 0, created_at = NOW()`,
      [phone, otpHash, expiresAt]
    );

    // TODO: send via real SMS/WhatsApp
    console.log(`[OTP] Phone: ${phone} | OTP: ${otp} | Expires: ${expiresAt.toISOString()}`);

    return res.json({ message: 'OTP sent', phone });
  } catch (error) {
    console.error('OTP start error:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /auth/verify-otp – verify OTP, start 24h trial, return JWT + refresh token
router.post('/verify-otp', verifyOtpLimiter, async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'phone and otp are required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const otpRow = await pool.query(
      'SELECT * FROM phone_otps WHERE phone = $1',
      [phone]
    );

    if (otpRow.rows.length === 0) {
      return res.status(400).json({ error: 'No OTP found for this phone number' });
    }

    const record = otpRow.rows[0];

    if (record.attempts >= 5) {
      return res.status(429).json({ error: 'Too many failed attempts. Request a new OTP.' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (sha256(String(otp)) !== record.otp_hash) {
      await pool.query(
        'UPDATE phone_otps SET attempts = attempts + 1 WHERE phone = $1',
        [phone]
      );
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP valid – delete used record
    await pool.query('DELETE FROM phone_otps WHERE phone = $1', [phone]);

    // Upsert user by phone
    let userResult = await pool.query(
      'SELECT id, phone, full_name, email FROM users WHERE phone = $1',
      [phone]
    );
    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        `INSERT INTO users (phone, created_at) VALUES ($1, NOW()) RETURNING id, phone, full_name, email`,
        [phone]
      );
    }
    const user = userResult.rows[0];

    // Start 24h trial (only on first OTP verify)
    const existingSub = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [user.id]
    );
    let subscription;
    if (existingSub.rows.length === 0) {
      const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const inserted = await pool.query(
        `INSERT INTO user_subscriptions (user_id, trial_ends_at, trial_active)
         VALUES ($1, $2, true) RETURNING *`,
        [user.id, trialEndsAt]
      );
      subscription = inserted.rows[0];
    } else {
      subscription = existingSub.rows[0];
    }

    const token = jwt.sign(
      { user_id: user.id, phone: user.phone },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { user_id: user.id, phone: user.phone, type: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      refreshToken,
      user: { id: user.id, phone: user.phone, full_name: user.full_name, email: user.email },
      entitlements: buildEntitlements(subscription),
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ error: 'OTP verification failed' });
  }
});

// POST /auth/refresh – exchange refresh token for new access token
router.post('/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const payload = jwt.verify(refreshToken, jwtSecret);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const token = jwt.sign(
      { user_id: payload.user_id, phone: payload.phone },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const newRefreshToken = jwt.sign(
      { user_id: payload.user_id, phone: payload.phone, type: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /me – get current user profile + entitlements
router.get('/me', meLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, jwtSecret);

    const userResult = await pool.query(
      'SELECT id, phone, full_name, email FROM users WHERE id = $1',
      [payload.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const subResult = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [user.id]
    );
    const subscription = subResult.rows[0] || null;

    return res.json({
      user: { id: user.id, phone: user.phone, full_name: user.full_name, email: user.email },
      entitlements: buildEntitlements(subscription),
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
