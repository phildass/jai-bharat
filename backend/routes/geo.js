'use strict';

/**
 * Geo API routes
 *
 * GET /api/geo/reverse  – Server-side proxy to LocationIQ reverse geocoding.
 *                         Keeps LOCATIONIQ_API_KEY out of the client.
 *                         Caches responses in-memory (max 500 entries, LRU eviction).
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const LOCATIONIQ_BASE = 'https://us1.locationiq.com/v1/reverse';
// Precision for cache key rounding (~1.1 km at equator)
const COORD_PRECISION = 2;

// ---------------------------------------------------------------------------
// Simple in-memory LRU cache (Map-based, insertion-order eviction)
// ---------------------------------------------------------------------------
const GEO_CACHE_MAX = 500;
const geoCache = new Map();

function getCached(key) {
  if (!geoCache.has(key)) return null;
  // Refresh insertion order (move to end)
  const value = geoCache.get(key);
  geoCache.delete(key);
  geoCache.set(key, value);
  return value;
}

function setCache(key, value) {
  if (geoCache.size >= GEO_CACHE_MAX) {
    // Evict oldest (first) entry
    geoCache.delete(geoCache.keys().next().value);
  }
  geoCache.set(key, value);
}

// ---------------------------------------------------------------------------
// Rate limiter – 30 req/min per IP (reverse geocoding is expensive)
// ---------------------------------------------------------------------------
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many geo requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// GET /api/geo/reverse
// ---------------------------------------------------------------------------
router.get('/reverse', geoLimiter, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Invalid lat/lon parameters' });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Reverse geocoding not configured' });
  }

  // Round coordinates for cache key
  const roundedLat = lat.toFixed(COORD_PRECISION);
  const roundedLon = lon.toFixed(COORD_PRECISION);
  const cacheKey = `${roundedLat},${roundedLon}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const url = new URL(LOCATIONIQ_BASE);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('lat', roundedLat);
    url.searchParams.set('lon', roundedLon);
    url.searchParams.set('format', 'json');

    // Use Node.js built-in fetch (Node 18+) or fall back to https
    let data;
    if (typeof fetch === 'function') {
      const response = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('LocationIQ error:', response.status, text);
        return res.status(502).json({ error: 'Geocoding service error' });
      }
      data = await response.json();
    } else {
      // Node < 18: use https module
      data = await new Promise((resolve, reject) => {
        const https = require('https');
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'GET',
          headers: { 'Accept-Language': 'en' },
        };
        const req2 = https.request(options, (res2) => {
          let body = '';
          res2.on('data', chunk => { body += chunk; });
          res2.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
          });
        });
        req2.on('error', reject);
        req2.end();
      });
    }

    const result = {
      display_name: data.display_name,
      address: {
        city:           data.address?.city || data.address?.town || data.address?.village,
        district:       data.address?.county || data.address?.state_district,
        state:          data.address?.state,
        country:        data.address?.country,
        postcode:       data.address?.postcode,
      },
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
    };

    setCache(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
});

module.exports = router;
