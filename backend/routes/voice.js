const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

const VOICE_VERIFICATION_THRESHOLD = 0.85;
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many session requests.', ttsText: 'Please wait before starting a new session.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const commandLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many commands.', ttsText: 'Please slow down and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const enrollVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many enrollment or verify requests.', ttsText: 'Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required', ttsText: 'Authentication required.' });
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', ttsText: 'Your session has expired. Please log in again.' });
  }
}

// ---------------------------------------------------------------------------
// Simple keyword intent parser (v1 – no AI needed yet)
// ---------------------------------------------------------------------------
const INTENT_KEYWORDS = {
  search: ['search', 'find', 'look', 'खोज', 'ढूंढ'],
  apply: ['apply', 'submit', 'register', 'आवेदन', 'जमा'],
  status: ['status', 'check', 'update', 'स्थिति', 'जाँच'],
  help: ['help', 'support', 'assist', 'मदद', 'सहायता'],
};

function parseIntent(transcript) {
  if (!transcript) return 'unknown';
  const lower = transcript.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  return 'unknown';
}

function buildResponse(intent, transcript) {
  switch (intent) {
    case 'search': return { response: 'Searching for relevant results.', ttsText: 'Searching for relevant results.' };
    case 'apply': return { response: 'Opening the application form.', ttsText: 'Opening the application form for you.' };
    case 'status': return { response: 'Checking your status.', ttsText: 'Checking the status of your request.' };
    case 'help': return { response: 'How can I help you?', ttsText: 'How can I help you today?' };
    default: return { response: 'I did not understand that.', ttsText: 'Sorry, I did not understand. Please try again.' };
  }
}

/**
 * Compute cosine similarity between two Float32Arrays.
 * Returns a value in [-1, 1]; 1 means identical direction.
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// ---------------------------------------------------------------------------
// POST /voice/session/start
// ---------------------------------------------------------------------------
router.post('/session/start', sessionLimiter, requireAuth, async (req, res) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await pool.query(
      `INSERT INTO voice_sessions (id, user_id, created_at, expires_at, is_active)
       VALUES ($1, $2, NOW(), $3, true)`,
      [sessionId, req.user.user_id, expiresAt]
    );

    return res.json({ sessionId, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Voice session start error:', error);
    return res.status(500).json({ error: 'Failed to start session', ttsText: 'Unable to start voice session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /voice/command
// ---------------------------------------------------------------------------
router.post('/command', commandLimiter, requireAuth, async (req, res) => {
  const { sessionId, transcript, language } = req.body;
  if (!sessionId || !transcript) {
    return res.status(400).json({ error: 'sessionId and transcript are required', ttsText: 'Missing required fields.' });
  }

  try {
    const sessionResult = await pool.query(
      'SELECT * FROM voice_sessions WHERE id = $1 AND user_id = $2 AND is_active = true',
      [sessionId, req.user.user_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired', ttsText: 'Your session was not found. Please start a new session.' });
    }

    const session = sessionResult.rows[0];
    if (new Date() > new Date(session.expires_at)) {
      await pool.query('UPDATE voice_sessions SET is_active = false WHERE id = $1', [sessionId]);
      return res.status(410).json({ error: 'Session expired', ttsText: 'Your session has expired. Please start a new one.' });
    }

    const intent = parseIntent(transcript);
    const { response, ttsText } = buildResponse(intent, transcript);

    return res.json({ intent, response, ttsText });
  } catch (error) {
    console.error('Voice command error:', error);
    return res.status(500).json({ error: 'Command processing failed', ttsText: 'Sorry, something went wrong.' });
  }
});

// ---------------------------------------------------------------------------
// POST /voice/enroll/start
// ---------------------------------------------------------------------------
router.post('/enroll/start', enrollVerifyLimiter, requireAuth, async (req, res) => {
  try {
    const enrollmentId = uuidv4();
    const promptText = 'Please say: My voice is my password, verify me.';

    // Store a pending enrollment placeholder
    await pool.query(
      `INSERT INTO voice_enrollments (id, user_id, embedding, created_at)
       VALUES ($1, $2, NULL, NOW())
       ON CONFLICT (user_id) DO UPDATE SET id = $1, embedding = NULL, created_at = NOW()`,
      [enrollmentId, req.user.user_id]
    );

    return res.json({ enrollmentId, promptText });
  } catch (error) {
    console.error('Enroll start error:', error);
    return res.status(500).json({ error: 'Failed to start enrollment', ttsText: 'Unable to start enrollment.' });
  }
});

// ---------------------------------------------------------------------------
// POST /voice/enroll/finish
// ---------------------------------------------------------------------------
router.post('/enroll/finish', enrollVerifyLimiter, requireAuth, async (req, res) => {
  const { enrollmentId, embedding } = req.body;
  if (!enrollmentId || !embedding) {
    return res.status(400).json({ error: 'enrollmentId and embedding are required', ttsText: 'Missing enrollment data.' });
  }

  try {
    const embeddingBuffer = Buffer.from(embedding, 'base64');

    await pool.query(
      `UPDATE voice_enrollments SET embedding = $1 WHERE id = $2 AND user_id = $3`,
      [embeddingBuffer, enrollmentId, req.user.user_id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Enroll finish error:', error);
    return res.status(500).json({ error: 'Failed to save enrollment', ttsText: 'Unable to complete enrollment.' });
  }
});

// ---------------------------------------------------------------------------
// POST /voice/verify
// ---------------------------------------------------------------------------
router.post('/verify', enrollVerifyLimiter, requireAuth, async (req, res) => {
  const { embedding } = req.body;
  if (!embedding) {
    return res.status(400).json({ error: 'embedding is required', ttsText: 'Missing voice data.' });
  }

  try {
    const result = await pool.query(
      'SELECT embedding FROM voice_enrollments WHERE user_id = $1 AND embedding IS NOT NULL',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No enrollment found', ttsText: 'No voice enrollment found. Please enroll first.' });
    }

    const incomingBuffer = Buffer.from(embedding, 'base64');
    const storedBuffer = result.rows[0].embedding;

    // Compare embeddings as float32 arrays using cosine similarity
    const incoming = new Float32Array(incomingBuffer.buffer, incomingBuffer.byteOffset, incomingBuffer.length / 4);
    const stored = new Float32Array(storedBuffer.buffer, storedBuffer.byteOffset, storedBuffer.length / 4);

    if (incoming.length !== stored.length) {
      return res.status(400).json({ error: 'Embedding dimension mismatch', ttsText: 'Voice data format mismatch. Please re-enroll.' });
    }

    const confidence = cosineSimilarity(incoming, stored);
    const verified = confidence >= VOICE_VERIFICATION_THRESHOLD;

    return res.json({ verified, confidence: parseFloat(confidence.toFixed(4)) });
  } catch (error) {
    console.error('Voice verify error:', error);
    return res.status(500).json({ error: 'Verification failed', ttsText: 'Unable to verify your voice.' });
  }
});

module.exports = router;
