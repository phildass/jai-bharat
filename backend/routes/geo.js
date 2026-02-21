'use strict';

/**
 * /api/geo/reverse  – LocationIQ reverse-geocoding proxy
 *
 * Never exposes LOCATIONIQ_API_KEY to the client.
 * Caches results in memory keyed by lat/lon rounded to 3 decimal places
 * (≈ 111 m precision) to reduce upstream API calls.
 */

const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory cache  { cacheKey → { result, expiresAt } }
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const geoCache = new Map();

function getCacheKey(lat, lon) {
  return `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
}

// Evict expired cache entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of geoCache) {
    if (entry.expiresAt <= now) {
      geoCache.delete(key);
    }
  }
}, 30 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Rate limiter – 60 requests per minute per IP
// ---------------------------------------------------------------------------
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// GET /api/geo/reverse?lat=..&lon=..
// ---------------------------------------------------------------------------
router.get('/reverse', geoLimiter, async (req, res) => {
  const { lat, lon } = req.query;

  // ── Validate ──────────────────────────────────────────────────────────────
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (
    !lat ||
    !lon ||
    Number.isNaN(latNum) ||
    Number.isNaN(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return res.status(400).json({
      error: 'Invalid lat/lon. lat must be in [-90,90] and lon in [-180,180].',
    });
  }

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cacheKey = getCacheKey(latNum, lonNum);
  const cached = geoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.result, cached: true });
  }

  // ── Upstream call ─────────────────────────────────────────────────────────
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Geocoding service is not configured.' });
  }

  try {
    const response = await axios.get('https://us1.locationiq.com/v1/reverse', {
      params: {
        key: apiKey,
        lat: latNum,
        lon: lonNum,
        format: 'json',
      },
      timeout: 8000,
    });

    const data = response.data;
    const addr = data.address || {};

    const result = {
      displayName: data.display_name || '',
      city: addr.city || addr.town || addr.village || addr.hamlet || '',
      district: addr.county || addr.state_district || '',
      state: addr.state || '',
      postcode: addr.postcode || '',
      country: addr.country || '',
    };

    // Store in cache
    geoCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });

    return res.json(result);
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return res.status(503).json({ error: 'Geocoding service authentication failed.' });
    }
    console.error('LocationIQ error:', err.message);
    return res.status(502).json({ error: 'Geocoding service unavailable.' });
  }
});

module.exports = router;
