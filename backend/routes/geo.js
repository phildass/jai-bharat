/**
 * Geo API Routes
 * GET /api/geo/reverse?lat=&lon= – server-side proxy to LocationIQ reverse geocode
 *
 * The LOCATIONIQ_API_KEY env var is NEVER sent to the client.
 */

'use strict';

const express = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ─── Simple in-memory LRU cache ───────────────────────────────────────────────
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Map<string, { value: object, expiresAt: number }>} */
const geoCache = new Map();

function cacheKey(lat, lon) {
  // ~100 m precision
  return `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
}

function cacheGet(key) {
  const entry = geoCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geoCache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  if (geoCache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest (first inserted) entry
    geoCache.delete(geoCache.keys().next().value);
  }
  geoCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many geo requests. Please try again later.' },
});

// ─── Helper: fetch LocationIQ ─────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Invalid JSON from upstream'));
        }
      });
    }).on('error', reject);
  });
}

// ─── GET /api/geo/reverse ─────────────────────────────────────────────────────
router.get('/reverse', geoLimiter, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Valid lat and lon query params are required' });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Geo service not configured (missing LOCATIONIQ_API_KEY)' });
  }

  const key = cacheKey(lat, lon);
  const cached = cacheGet(key);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const url =
    `https://us1.locationiq.com/v1/reverse` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&lat=${lat}&lon=${lon}&format=json`;

  try {
    const data = await fetchJSON(url);

    if (data.error) {
      return res.status(502).json({ error: `Geocoding error: ${data.error}` });
    }

    const addr = data.address || {};
    const result = {
      displayName: data.display_name || null,
      city:       addr.city || addr.town || addr.village || addr.county || null,
      district:   addr.county || addr.state_district || null,
      state:      addr.state || null,
      postcode:   addr.postcode || null,
      country:    addr.country_code ? addr.country_code.toUpperCase() : null,
      lat,
      lon,
    };

    cacheSet(key, result);
    return res.json(result);
  } catch (error) {
    console.error('Geo reverse error:', error);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
});

module.exports = router;
