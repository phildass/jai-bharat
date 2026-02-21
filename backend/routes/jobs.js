'use strict';

/**
 * Jobs API routes
 *
 * GET  /api/jobs              – search + filter + paginate
 * GET  /api/jobs/nearby       – jobs within radius (Haversine SQL)
 * GET  /api/jobs/:id          – single job detail
 */

const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Rate limiter – 120 req/min for job search
// ---------------------------------------------------------------------------
const jobsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Input validators
// ---------------------------------------------------------------------------
const VALID_SORT = new Set(['latest', 'closingSoon', 'relevance']);
const VALID_STATUS = new Set(['open', 'upcoming', 'closed']);
const VALID_RADIUS = new Set([10, 25, 50, 100]);

function sanitizeText(value, maxLen = 200) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().slice(0, maxLen);
}

function parsePositiveInt(value, defaultVal, max = 1000) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}

// ---------------------------------------------------------------------------
// GET /api/jobs
// ---------------------------------------------------------------------------
router.get('/', jobsLimiter, async (req, res) => {
  try {
    const q        = sanitizeText(req.query.q);
    const state    = sanitizeText(req.query.state);
    const district = sanitizeText(req.query.district);
    const category = sanitizeText(req.query.category);
    const status   = sanitizeText(req.query.status);
    const sort     = VALID_SORT.has(req.query.sort) ? req.query.sort : 'latest';
    const page     = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 100);
    const offset   = (page - 1) * pageSize;

    const params = [];
    const conditions = [];

    // Full-text search
    if (q) {
      params.push(q);
      conditions.push(`fts_vector @@ plainto_tsquery('english', $${params.length})`);
    }

    if (state)    { params.push(state);    conditions.push(`state    ILIKE $${params.length}`); }
    if (district) { params.push(district); conditions.push(`district ILIKE $${params.length}`); }
    if (category) { params.push(category); conditions.push(`category ILIKE $${params.length}`); }
    if (status && VALID_STATUS.has(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Order by
    let orderBy;
    if (sort === 'relevance' && q) {
      orderBy = `ts_rank(fts_vector, plainto_tsquery('english', $1)) DESC, posted_at DESC`;
    } else if (sort === 'closingSoon') {
      orderBy = `last_date ASC NULLS LAST`;
    } else {
      orderBy = `posted_at DESC NULLS LAST`;
    }

    const dataQuery = `
      SELECT id, title, organization, board, category, status,
             state, district, city, location_text,
             posted_at, last_date, apply_url, notification_url
      FROM jobs
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(pageSize, offset);

    const countQuery = `SELECT COUNT(*)::int AS total FROM jobs ${where}`;
    const countParams = params.slice(0, params.length - 2);

    // Facets (always from full table or filtered by current q/filters excluding the facet dimension)
    const facetsQuery = `
      SELECT
        ARRAY(SELECT DISTINCT state    FROM jobs WHERE state    IS NOT NULL ORDER BY state)    AS states,
        ARRAY(SELECT DISTINCT district FROM jobs WHERE district IS NOT NULL ORDER BY district) AS districts,
        ARRAY(SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL ORDER BY category) AS categories,
        ARRAY(SELECT DISTINCT status   FROM jobs WHERE status   IS NOT NULL ORDER BY status)   AS statuses
    `;

    const [dataResult, countResult, facetsResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
      pool.query(facetsQuery),
    ]);

    return res.json({
      results:  dataResult.rows,
      total:    countResult.rows[0].total,
      page,
      pageSize,
      facets: {
        states:     facetsResult.rows[0].states,
        districts:  facetsResult.rows[0].districts,
        categories: facetsResult.rows[0].categories,
        statuses:   facetsResult.rows[0].statuses,
      },
    });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/nearby  – must be defined BEFORE /:id to avoid conflict
// ---------------------------------------------------------------------------
router.get('/nearby', jobsLimiter, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid lat/lon parameters' });
    }

    const rawRadius = parseInt(req.query.radiusKm, 10);
    const radiusKm  = VALID_RADIUS.has(rawRadius) ? rawRadius : 25;
    const limit     = parsePositiveInt(req.query.limit, 50, 200);

    // Haversine formula in SQL
    const query = `
      SELECT id, title, organization, board, category, status,
             state, district, city, location_text,
             posted_at, last_date, apply_url, notification_url,
             lat, lon,
             (6371 * acos(
               LEAST(1.0,
                 cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
                 sin(radians($1)) * sin(radians(lat))
               )
             )) AS distance_km
      FROM jobs
      WHERE lat IS NOT NULL AND lon IS NOT NULL
        AND (6371 * acos(
               LEAST(1.0,
                 cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
                 sin(radians($1)) * sin(radians(lat))
               )
             )) <= $3
      ORDER BY distance_km ASC
      LIMIT $4
    `;

    const result = await pool.query(query, [lat, lon, radiusKm, limit]);

    return res.json({
      results: result.rows.map(r => ({
        ...r,
        distance_km: parseFloat(parseFloat(r.distance_km).toFixed(2)),
      })),
      total:    result.rows.length,
      radiusKm,
      center: { lat, lon },
    });
  } catch (err) {
    console.error('GET /api/jobs/nearby error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/:id
// ---------------------------------------------------------------------------
router.get('/:id', jobsLimiter, async (req, res) => {
  try {
    const id = req.params.id;

    // Basic UUID format check
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const result = await pool.query(
      `SELECT id, title, organization, board, category, status,
              apply_url, notification_url, source_url,
              state, district, city, location_text, lat, lon,
              posted_at, last_date, created_at, updated_at
       FROM jobs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/jobs/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
