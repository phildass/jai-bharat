'use strict';

/**
 * Geo API routes
 * GET /api/geo/reverse  – reverse geocode via LocationIQ (server-side, cached)
 */

const express = require('express');
const axios = require('axios');
const { LRUCache } = require('lru-cache');

const router = express.Router();

// ---------------------------------------------------------------------------
// LRU cache – key: "lat3:lon3" (coords rounded to 3 decimal places)
// ---------------------------------------------------------------------------
const geoCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
});

const LOCATIONIQ_BASE = 'https://us1.locationiq.com/v1/reverse';

// ---------------------------------------------------------------------------
// GET /api/geo/reverse?lat=&lon=
// ---------------------------------------------------------------------------
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!isFinite(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({ error: 'Invalid lat parameter' });
  }
  if (!isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ error: 'Invalid lon parameter' });
  }

  const cacheKey = `${latNum.toFixed(3)}:${lonNum.toFixed(3)}`;
  const cached = geoCache.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Reverse geocoding is not configured' });
  }

  try {
    const response = await axios.get(LOCATIONIQ_BASE, {
      params: {
        key: apiKey,
        lat: latNum,
        lon: lonNum,
        format: 'json',
        'accept-language': 'en',
      },
      timeout: 5000,
    });

    const addr = response.data.address || {};
    const city = [addr.city, addr.town, addr.village, addr.municipality]
      .find(Boolean) || '';
    const district = [addr.county, addr.state_district, addr.district]
      .find(Boolean) || '';
    const normalized = {
      displayName: response.data.display_name || '',
      city,
      district,
      state: addr.state || '',
      postcode: addr.postcode || '',
    };

    geoCache.set(cacheKey, normalized);
    return res.json(normalized);
  } catch (err) {
    if (err.response) {
      console.error('LocationIQ error:', err.response.status, err.response.data);
      return res
        .status(502)
        .json({ error: 'Geocoding provider error', detail: err.response.status });
    }
    console.error('Geo reverse error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
