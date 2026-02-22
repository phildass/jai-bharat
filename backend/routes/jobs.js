'use strict';

/**
 * Jobs API Routes
 *
 * GET  /api/jobs          – keyword search + filters (FTS, state, category, etc.)
 * GET  /api/jobs/nearby   – proximity search using Haversine formula
 * GET  /api/jobs/:id      – single job detail
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
// Test data – returned when TEST_DATA_MODE=true (no DB required)
// ---------------------------------------------------------------------------
const TEST_JOBS = [
  {
    id: 1,
    title: 'Junior Engineer (Civil)',
    organisation: 'Public Works Department',
    category: 'Engineering',
    qualification: 'B.Tech / BE (Civil)',
    status: 'open',
    state: 'Maharashtra',
    district: 'Pune',
    location_label: 'Pune Division',
    lat: 18.5204,
    lon: 73.8567,
    vacancies: 120,
    salary: '₹35,400 – ₹1,12,400',
    apply_start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    apply_end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    official_notification_url: 'https://example.gov.in/notice/1',
    source_url: 'https://example.gov.in/1',
  },
  {
    id: 2,
    title: 'Staff Nurse',
    organisation: 'All India Institute of Medical Sciences',
    category: 'Medical',
    qualification: 'B.Sc Nursing',
    status: 'open',
    state: 'Delhi',
    district: 'New Delhi',
    location_label: 'AIIMS New Delhi',
    lat: 28.5672,
    lon: 77.2100,
    vacancies: 400,
    salary: '₹44,900 – ₹1,42,400',
    apply_start_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    apply_end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    official_notification_url: 'https://example.gov.in/notice/2',
    source_url: 'https://example.gov.in/2',
  },
  {
    id: 3,
    title: 'Sub-Inspector (Executive)',
    organisation: 'Central Reserve Police Force',
    category: 'Police / Defence',
    qualification: 'Graduate',
    status: 'upcoming',
    state: 'National',
    district: null,
    location_label: 'All India',
    lat: null,
    lon: null,
    vacancies: 1458,
    salary: '₹35,400 – ₹1,12,400',
    apply_start_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    apply_end_date: new Date(Date.now() + 35 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    official_notification_url: 'https://example.gov.in/notice/3',
    source_url: 'https://example.gov.in/3',
  },
  {
    id: 4,
    title: 'Assistant Section Officer',
    organisation: 'Staff Selection Commission',
    category: 'Administrative',
    qualification: 'Graduate',
    status: 'open',
    state: 'National',
    district: null,
    location_label: 'All India',
    lat: null,
    lon: null,
    vacancies: 523,
    salary: '₹44,900 – ₹1,42,400',
    apply_start_date: new Date(Date.now() - 8 * 86400000).toISOString(),
    apply_end_date: new Date(Date.now() + 12 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    official_notification_url: 'https://example.gov.in/notice/4',
    source_url: 'https://example.gov.in/4',
  },
  {
    id: 5,
    title: 'Primary Teacher',
    organisation: 'Government of Karnataka – Education Department',
    category: 'Teaching',
    qualification: 'D.Ed / B.Ed',
    status: 'result_out',
    state: 'Karnataka',
    district: 'Bengaluru',
    location_label: 'Bengaluru Urban',
    lat: 12.9716,
    lon: 77.5946,
    vacancies: 2200,
    salary: '₹17,000 – ₹35,300',
    apply_start_date: new Date(Date.now() - 60 * 86400000).toISOString(),
    apply_end_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    official_notification_url: 'https://example.gov.in/notice/5',
    source_url: 'https://example.gov.in/5',
  },
];

const TEST_DATA_MODE = process.env.TEST_DATA_MODE === 'true';

// ---------------------------------------------------------------------------
// Rate limiter – 60 requests per minute per IP
// ---------------------------------------------------------------------------
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

function safeInt(val, def) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function safeFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

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

// ---------------------------------------------------------------------------
// GET /api/jobs
// Query params: q, state, district, category, qualification, status,
//               sort (latest|closing_soon|relevance), page, pageSize
// ---------------------------------------------------------------------------
router.get('/', jobsLimiter, async (req, res) => {
  // ── Test data mode (no DB required) ───────────────────────────────────────
  if (TEST_DATA_MODE) {
    const { q, state, category, status } = req.query;
    let results = TEST_JOBS.slice();
    if (q)        results = results.filter(j => j.title.toLowerCase().includes(q.toLowerCase()) || j.organisation.toLowerCase().includes(q.toLowerCase()));
    if (state)    results = results.filter(j => j.state && j.state.toLowerCase() === state.toLowerCase());
    if (category) results = results.filter(j => j.category && j.category.toLowerCase() === category.toLowerCase());
    if (status)   results = results.filter(j => j.status === status);
    const states     = [...new Set(TEST_JOBS.map(j => j.state).filter(Boolean))].sort();
    const categories = [...new Set(TEST_JOBS.map(j => j.category).filter(Boolean))].sort();
    const statuses   = [...new Set(TEST_JOBS.map(j => j.status).filter(Boolean))].sort();
    return res.json({ results, total: results.length, page: 1, pageSize: results.length, facets: { states, categories, statuses } });
  }

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
      const safeQ = q.trim().slice(0, 200); // cap query length to prevent abuse
      conditions.push(`(search_vector @@ plainto_tsquery('english', $${idx}) OR title ILIKE $${idx + 1})`);
      params.push(safeQ, `%${safeQ}%`);
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

    const countParams = params.slice(0, params.length - 2);
    const countQuery = `SELECT COUNT(*) FROM jobs ${where}`;

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
    // Fall back to test data when DB is unreachable
    const { q, state, category, status } = req.query;
    let results = TEST_JOBS.slice();
    if (q)        results = results.filter(j => j.title.toLowerCase().includes(q.toLowerCase()) || j.organisation.toLowerCase().includes(q.toLowerCase()));
    if (state)    results = results.filter(j => j.state && j.state.toLowerCase() === state.toLowerCase());
    if (category) results = results.filter(j => j.category && j.category.toLowerCase() === category.toLowerCase());
    if (status)   results = results.filter(j => j.status === status);
    const states     = [...new Set(TEST_JOBS.map(j => j.state).filter(Boolean))].sort();
    const categories = [...new Set(TEST_JOBS.map(j => j.category).filter(Boolean))].sort();
    const statuses   = [...new Set(TEST_JOBS.map(j => j.status).filter(Boolean))].sort();
    return res.json({ results, total: results.length, page: 1, pageSize: results.length, facets: { states, categories, statuses } });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/nearby  (must come BEFORE /:id)
// Query params: lat, lon, radiusKm (10|25|50|100, default 25), limit (default 20)
// ---------------------------------------------------------------------------
router.get('/nearby', jobsLimiter, async (req, res) => {
  const lat = safeFloat(req.query.lat);
  const lon = safeFloat(req.query.lon);

  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Invalid lat/lon. lat must be in [-90,90] and lon in [-180,180].' });
  }

  const radiusKm = [10, 25, 50, 100].includes(Number(req.query.radiusKm))
    ? Number(req.query.radiusKm)
    : 25;
  const limit = Math.min(safeInt(req.query.limit, 20), 100);

  // ── Test data mode ────────────────────────────────────────────────────────
  if (TEST_DATA_MODE) {
    const nearby = TEST_JOBS
      .filter(j => j.lat !== null && j.lon !== null && j.status === 'open')
      .map(j => ({ ...j, distanceKm: parseFloat(haversine(lat, lon, j.lat, j.lon).toFixed(2)) }))
      .filter(j => j.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    return res.json({ results: nearby, total: nearby.length, radiusKm });
  }

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
    // Fall back to test data when DB is unreachable
    const nearby = TEST_JOBS
      .filter(j => j.lat !== null && j.lon !== null && j.status === 'open')
      .map(j => ({ ...j, distanceKm: parseFloat(haversine(lat, lon, j.lat, j.lon).toFixed(2)) }))
      .filter(j => j.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    return res.json({ results: nearby, total: nearby.length, radiusKm });
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

  // ── Test data mode ────────────────────────────────────────────────────────
  if (TEST_DATA_MODE) {
    const job = TEST_JOBS.find(j => j.id === id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json(job);
  }

  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/jobs/:id error:', err);
    // Fall back to test data when DB is unreachable
    const job = TEST_JOBS.find(j => j.id === id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json(job);
  }
});

module.exports = router;
