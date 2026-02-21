/**
 * Jobs API Routes
 * GET /api/jobs           – list/search with filters, pagination, facets
 * GET /api/jobs/nearby    – jobs within radius sorted by distance
 * GET /api/jobs/:id       – single job detail
 */

'use strict';

const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const jobsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Cache whether PostGIS is available so we only query once
let _postgisAvailable = null;
async function isPostGISAvailable() {
  if (_postgisAvailable !== null) return _postgisAvailable;
  try {
    const result = await pool.query(
      "SELECT count(*) FROM pg_extension WHERE extname = 'postgis'"
    );
    _postgisAvailable = parseInt(result.rows[0].count, 10) > 0;
  } catch {
    _postgisAvailable = false;
  }
  return _postgisAvailable;
}

// ─── GET /api/jobs/nearby ────────────────────────────────────────────────────
// Must be registered before /:id to avoid route shadowing
router.get('/nearby', jobsLimiter, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 25, 100);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Valid lat and lon query params are required' });
  }

  try {
    const hasPostGIS = await isPostGISAvailable();
    let rows;

    if (hasPostGIS) {
      const result = await pool.query(
        `SELECT id, title, organization, board, category, status, apply_url,
                state, district, city, location_text, lat, lon, posted_at, last_date,
                ST_Distance(
                  location,
                  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                ) / 1000.0 AS distance_km
         FROM jobs
         WHERE status = 'active'
           AND location IS NOT NULL
           AND ST_DWithin(
             location,
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
             $3 * 1000
           )
         ORDER BY distance_km ASC
         LIMIT $4`,
        [lat, lon, radiusKm, limit]
      );
      rows = result.rows;
    } else {
      // Haversine fallback (pure SQL, no PostGIS)
      const result = await pool.query(
        `SELECT id, title, organization, board, category, status, apply_url,
                state, district, city, location_text, lat, lon, posted_at, last_date,
                6371.0 * 2.0 * ASIN(SQRT(
                  POWER(SIN(RADIANS(($1::float8 - lat) / 2.0)), 2) +
                  COS(RADIANS($1::float8)) * COS(RADIANS(lat)) *
                  POWER(SIN(RADIANS(($2::float8 - lon) / 2.0)), 2)
                )) AS distance_km
         FROM jobs
         WHERE status = 'active'
           AND lat IS NOT NULL AND lon IS NOT NULL
           AND 6371.0 * 2.0 * ASIN(SQRT(
                 POWER(SIN(RADIANS(($1::float8 - lat) / 2.0)), 2) +
                 COS(RADIANS($1::float8)) * COS(RADIANS(lat)) *
                 POWER(SIN(RADIANS(($2::float8 - lon) / 2.0)), 2)
               )) <= $3::float8
         ORDER BY distance_km ASC
         LIMIT $4`,
        [lat, lon, radiusKm, limit]
      );
      rows = result.rows;
    }

    return res.json({
      jobs: rows.map(({ distance_km, ...job }) => ({
        ...job,
        distanceKm: parseFloat(parseFloat(distance_km).toFixed(2)),
      })),
      total: rows.length,
      lat,
      lon,
      radiusKm,
    });
  } catch (error) {
    console.error('Jobs nearby error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/jobs ────────────────────────────────────────────────────────────
router.get('/', jobsLimiter, async (req, res) => {
  const q        = req.query.q        || '';
  const state    = req.query.state    || '';
  const category = req.query.category || '';
  const status   = req.query.status   || 'active';
  const board    = req.query.board    || '';
  const page     = Math.max(parseInt(req.query.page,  10) || 1,   1);
  const limit    = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset   = (page - 1) * limit;

  const ALLOWED_SORT = ['posted_at', 'last_date', 'title', 'created_at'];
  const sort  = ALLOWED_SORT.includes(req.query.sort) ? req.query.sort : 'posted_at';
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

  const params = [];
  const conditions = [];

  if (q) {
    params.push(q);
    conditions.push(`search_vector @@ plainto_tsquery('english', $${params.length})`);
  }
  if (state) {
    params.push(state);
    conditions.push(`state ILIKE $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category ILIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (board) {
    params.push(board);
    conditions.push(`board ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const filterParams = [...params]; // params up to (before limit/offset)

  params.push(limit);
  params.push(offset);

  try {
    const [dataResult, countResult, facetsResult] = await Promise.all([
      pool.query(
        `SELECT id, title, organization, board, category, status, apply_url,
                state, district, city, location_text, lat, lon,
                posted_at, last_date, created_at
         FROM jobs
         ${where}
         ORDER BY ${sort} ${order} NULLS LAST
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM jobs ${where}`, filterParams),
      pool.query(
        `SELECT state, category, status, COUNT(*) AS cnt
         FROM jobs ${where}
         GROUP BY state, category, status`,
        filterParams
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    // Aggregate facets
    const facets = { states: {}, categories: {}, statuses: {} };
    for (const row of facetsResult.rows) {
      const n = parseInt(row.cnt, 10);
      if (row.state)    facets.states[row.state]          = (facets.states[row.state]          || 0) + n;
      if (row.category) facets.categories[row.category]   = (facets.categories[row.category]   || 0) + n;
      if (row.status)   facets.statuses[row.status]        = (facets.statuses[row.status]        || 0) + n;
    }

    return res.json({
      jobs: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      facets,
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────
router.get('/:id', jobsLimiter, async (req, res) => {
  const { id } = req.params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid job ID format' });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, organization, board, category, status, apply_url,
              notification_url, source_url, state, district, city, location_text,
              lat, lon, posted_at, last_date, created_at, updated_at
       FROM jobs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Job detail error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
