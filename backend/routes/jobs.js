'use strict';

/**
 * Jobs API Routes
 *
 * GET  /api/jobs                  – search / filter jobs
 * GET  /api/jobs/nearby           – proximity search (Haversine)
 * GET  /api/jobs/:id              – single job detail
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/** General jobs search – 60 requests per minute per IP */
const jobsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two lat/lon points */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeInt(val, def) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function safeFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// GET /api/jobs
// Query params: q, state, district, category, qualification, status,
//               sort (latest|closing_soon|relevance), page, pageSize
// ---------------------------------------------------------------------------
router.get('/', jobsLimiter, async (req, res) => {
  try {
    const {
      q,
      state,
      district,
      category,
      qualification,
      status,
      sort = 'latest',
      page,
      pageSize,
    } = req.query;

    const pg = safeInt(page, 1);
    const ps = Math.min(safeInt(pageSize, 20), 100);
    const offset = (pg - 1) * ps;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (q && q.trim()) {
      conditions.push(`(search_vector @@ plainto_tsquery('english', $${idx}) OR title ILIKE $${idx + 1})`);
      params.push(q.trim(), `%${q.trim()}%`);
      idx += 2;
    }
    if (state)         { conditions.push(`state ILIKE $${idx++}`);         params.push(state); }
    if (district)      { conditions.push(`district ILIKE $${idx++}`);      params.push(district); }
    if (category)      { conditions.push(`category ILIKE $${idx++}`);      params.push(category); }
    if (qualification) { conditions.push(`qualification ILIKE $${idx++}`); params.push(qualification); }
    if (status)        { conditions.push(`status = $${idx++}`);            params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort order
    let orderBy;
    if (sort === 'closing_soon') {
      orderBy = 'apply_end_date ASC NULLS LAST';
    } else if (sort === 'relevance' && q && q.trim()) {
      orderBy = `ts_rank(search_vector, plainto_tsquery('english', $${idx})) DESC, published_at DESC`;
      params.push(q.trim());
      idx++;
    } else {
      orderBy = 'published_at DESC';
    }

    const dataQuery = `
      SELECT id, title, organisation, category, qualification, status,
             state, district, location_label, vacancies, salary,
             apply_start_date, apply_end_date, published_at,
             official_notification_url, source_url
      FROM jobs
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(ps, offset);

    const countQuery = `SELECT COUNT(*) FROM jobs ${where}`;
    const countParams = params.slice(0, params.length - 2); // exclude LIMIT/OFFSET

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    // Facets: distinct values for state, category, status
    const facetQuery = `
      SELECT
        (SELECT json_agg(DISTINCT state ORDER BY state) FROM jobs ${where}) AS states,
        (SELECT json_agg(DISTINCT category ORDER BY category) FROM jobs ${where}) AS categories,
        (SELECT json_agg(DISTINCT status ORDER BY status) FROM jobs ${where}) AS statuses
    `;
    const facetResult = await pool.query(facetQuery, countParams);
    const facets = facetResult.rows[0] || {};

    return res.json({
      results: dataResult.rows,
      total,
      page: pg,
      pageSize: ps,
      facets: {
        states: facets.states || [],
        categories: facets.categories || [],
        statuses: facets.statuses || [],
      },
    });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/nearby  (must come BEFORE /:id)
// Query params: lat, lon, radiusKm (10|25|50|100, default 25), limit (default 20)
// ---------------------------------------------------------------------------
router.get('/nearby', jobsLimiter, async (req, res) => {
  const lat = safeFloat(req.query.lat);
  const lon = safeFloat(req.query.lon);

  if (lat === null || lon === null) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const radiusKm = [10, 25, 50, 100].includes(Number(req.query.radiusKm))
    ? Number(req.query.radiusKm)
    : 25;
  const limit = Math.min(safeInt(req.query.limit, 20), 100);

  try {
    // Approximate bounding-box pre-filter then exact Haversine in application layer
    const latDelta = radiusKm / 111.0;
    const lonDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    const result = await pool.query(
      `SELECT id, title, organisation, category, status,
              state, district, location_label, lat, lon,
              vacancies, salary, apply_end_date, published_at,
              official_notification_url
       FROM jobs
       WHERE lat IS NOT NULL AND lon IS NOT NULL
         AND lat BETWEEN $1 AND $2
         AND lon BETWEEN $3 AND $4
         AND status = 'open'
       LIMIT 500`,
      [lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta]
    );

    const nearby = result.rows
      .map((job) => ({
        ...job,
        distanceKm: parseFloat(haversine(lat, lon, job.lat, job.lon).toFixed(2)),
      }))
      .filter((job) => job.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return res.json({ results: nearby, total: nearby.length, radiusKm });
  } catch (err) {
    console.error('GET /api/jobs/nearby error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/:id
// ---------------------------------------------------------------------------
router.get('/:id', jobsLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid job id' });
  }

  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
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
