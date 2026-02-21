'use strict';

/**
 * Geo API Routes
 *
 * GET /api/geo/reverse?lat=&lon=
 *   Proxies LocationIQ reverse geocoding.
 *   Result is cached in the geo_cache table (TTL: 24 h).
 *   LOCATIONIQ_API_KEY is read server-side only – never exposed to clients.
 */

const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/** Geo reverse – 30 requests per minute per IP (cached, so low limit is fine) */
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many geocoding requests. Please try again later.' },
});

const CACHE_TTL_HOURS = 24;

function roundTo4dp(n) {
  return Math.round(n * 10000) / 10000;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'jai-bharat/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// GET /api/geo/reverse?lat=&lon=
router.get('/reverse', geoLimiter, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon are required numeric values' });
  }

  const cacheKey = `${roundTo4dp(lat)}:${roundTo4dp(lon)}`;

  try {
    // Check cache
    const cached = await pool.query(
      `SELECT result FROM geo_cache
       WHERE cache_key = $1 AND cached_at > NOW() - ($2 || ' hours')::INTERVAL`,
      [cacheKey, String(CACHE_TTL_HOURS)]
    );

    if (cached.rows.length > 0) {
      return res.json(cached.rows[0].result);
    }

    // Fetch from LocationIQ
    const apiKey = process.env.LOCATIONIQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Geocoding service not configured' });
    }

    const url =
      `https://us1.locationiq.com/v1/reverse?key=${encodeURIComponent(apiKey)}` +
      `&lat=${lat}&lon=${lon}&format=json`;

    const data = await fetchJson(url);

    // Strip sensitive fields before caching / returning
    const result = {
      display_name: data.display_name,
      address: data.address,
      lat: data.lat,
      lon: data.lon,
    };

    // Upsert cache
    await pool.query(
      `INSERT INTO geo_cache (cache_key, result, cached_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET result = $2, cached_at = NOW()`,
      [cacheKey, result]
    );

    return res.json(result);
  } catch (err) {
    console.error('GET /api/geo/reverse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
