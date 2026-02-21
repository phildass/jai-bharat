'use strict';

/**
 * /api/jobs/nearby  – geospatial job search using Haversine formula
 * /api/jobs/seed    – (dev only) insert sample jobs into the database
 */

const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Allowed radius values (km)
const ALLOWED_RADII = [10, 25, 50, 100];
const DEFAULT_RADIUS = 25;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Rate limiter – 120 requests per minute per IP
// ---------------------------------------------------------------------------
const jobsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Rate limiter for the dev-only seed endpoint
const seedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many seed requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// GET /api/jobs/nearby
// Query params:
//   lat, lon       – user coordinates (required)
//   radiusKm       – one of [10,25,50,100]  (default 25)
//   limit          – max results            (default 50, max 100)
//   department     – filter by department   (optional)
//   source         – filter by source       (optional)
//   state          – filter by state        (optional)
//   last_date_from – filter jobs whose last_date >= this date (YYYY-MM-DD, optional)
//   keyword        – full-text filter on title/department     (optional)
// ---------------------------------------------------------------------------
router.get('/nearby', jobsLimiter, async (req, res) => {
  // ── Validate lat/lon ──────────────────────────────────────────────────────
  const latNum = parseFloat(req.query.lat);
  const lonNum = parseFloat(req.query.lon);

  if (
    Number.isNaN(latNum) || Number.isNaN(lonNum) ||
    latNum < -90 || latNum > 90 ||
    lonNum < -180 || lonNum > 180
  ) {
    return res.status(400).json({
      error: 'Invalid lat/lon. lat must be in [-90,90] and lon in [-180,180].',
    });
  }

  // ── Radius ────────────────────────────────────────────────────────────────
  let radiusKm = parseInt(req.query.radiusKm, 10);
  if (!ALLOWED_RADII.includes(radiusKm)) {
    // Clamp to nearest allowed value
    radiusKm = ALLOWED_RADII.reduce((prev, curr) =>
      Math.abs(curr - (radiusKm || DEFAULT_RADIUS)) < Math.abs(prev - (radiusKm || DEFAULT_RADIUS))
        ? curr
        : prev
    );
  }

  // ── Limit ─────────────────────────────────────────────────────────────────
  let limit = parseInt(req.query.limit, 10) || 50;
  if (limit < 1) limit = 1;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  // ── Optional filters ──────────────────────────────────────────────────────
  const { department, source, state, last_date_from, keyword } = req.query;

  // ── Build Haversine query ─────────────────────────────────────────────────
  // Pre-filter with a bounding box (~radiusKm/111 degrees) so the index is used,
  // then refine with the exact Haversine expression.
  const degDelta = radiusKm / 111.0;

  const params = [latNum, lonNum, radiusKm, latNum - degDelta, latNum + degDelta, lonNum - degDelta, lonNum + degDelta, limit];
  let idx = params.length; // next param index

  let filters = '';

  if (department) {
    params.push(department);
    filters += ` AND LOWER(department) = LOWER($${++idx})`;
  }
  if (source) {
    params.push(source);
    filters += ` AND LOWER(source) = LOWER($${++idx})`;
  }
  if (state) {
    params.push(state);
    filters += ` AND LOWER(state) = LOWER($${++idx})`;
  }
  if (last_date_from) {
    const d = new Date(last_date_from);
    if (!isNaN(d.getTime())) {
      params.push(last_date_from);
      filters += ` AND last_date >= $${++idx}`;
    }
  }
  if (keyword) {
    params.push(`%${keyword.replace(/[%_\\]/g, c => '\\' + c)}%`);
    filters += ` AND (title ILIKE $${++idx} OR department ILIKE $${idx})`;
  }

  const sql = `
    SELECT
      id, title, department, source, apply_url, notification_pdf_url,
      state, district, city, location_text, lat, lon, posted_at, last_date,
      ROUND(
        (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
            sin(radians($1)) * sin(radians(lat)))
        ))::numeric, 2
      ) AS distance_km
    FROM jobs
    WHERE
      lat BETWEEN $4 AND $5
      AND lon BETWEEN $6 AND $7
      AND (6371 * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) +
          sin(radians($1)) * sin(radians(lat)))
      )) <= $3
      ${filters}
    ORDER BY distance_km ASC
    LIMIT $8
  `;

  try {
    const result = await pool.query(sql, params);
    return res.json({
      lat: latNum,
      lon: lonNum,
      radiusKm,
      total: result.rowCount,
      jobs: result.rows,
    });
  } catch (err) {
    console.error('Jobs nearby query error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/seed  – dev-only seed endpoint (disabled in production)
// ---------------------------------------------------------------------------
router.get('/seed', seedLimiter, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed endpoint is disabled in production.' });
  }

  const SAMPLE_JOBS = require('../scripts/sampleJobs');

  try {
    let inserted = 0;
    for (const job of SAMPLE_JOBS) {
      await pool.query(
        `INSERT INTO jobs
           (title, department, source, apply_url, notification_pdf_url,
            state, district, city, location_text, lat, lon, posted_at, last_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (title, state, district) DO NOTHING`,
        [
          job.title, job.department, job.source, job.apply_url,
          job.notification_pdf_url || null, job.state, job.district,
          job.city || null, job.location_text, job.lat, job.lon,
          job.posted_at, job.last_date,
        ]
      );
      inserted++;
    }
    return res.json({ message: `Seeded ${inserted} jobs.` });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

module.exports = router;
