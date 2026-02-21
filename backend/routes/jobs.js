'use strict';

/**
 * Jobs API routes
 * GET /api/jobs           – search + filter + pagination
 * GET /api/jobs/nearby    – jobs within radius sorted by distance
 * GET /api/jobs/:id       – single job
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// ---------------------------------------------------------------------------
// Supabase client (initialised lazily so tests can override env)
// ---------------------------------------------------------------------------
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Allowed radius values (km)
// ---------------------------------------------------------------------------
const ALLOWED_RADII = [10, 25, 50, 100];

// ---------------------------------------------------------------------------
// GET /api/jobs
// Query params: q, state, district, category, status, sort, page, pageSize
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const {
      q = '',
      state = '',
      district = '',
      category = '',
      status = '',
      sort = 'last_date',
      page = '1',
      pageSize = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase.from('jobs').select('*', { count: 'exact' });

    // Full-text search
    if (q.trim()) {
      query = query.textSearch('search_vector', q.trim(), {
        type: 'websearch',
        config: 'english',
      });
    }

    // Filters
    if (state.trim()) query = query.ilike('state', state.trim());
    if (district.trim()) query = query.ilike('district', district.trim());
    if (category.trim()) query = query.ilike('category', category.trim());
    if (status.trim()) query = query.eq('status', status.trim());

    // Sort
    const validSortColumns = ['last_date', 'created_at', 'title'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'last_date';
    query = query.order(sortColumn, { ascending: sortColumn === 'title' });

    // Pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Jobs list error:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }

    // Basic facets (state, status, category)
    const [statesFacet, statusFacet, categoryFacet] = await Promise.all([
      supabase.from('jobs').select('state').neq('state', null),
      supabase.from('jobs').select('status').neq('status', null),
      supabase.from('jobs').select('category').neq('category', null),
    ]);

    const facets = {
      states: buildFacet(statesFacet.data || [], 'state'),
      statuses: buildFacet(statusFacet.data || [], 'status'),
      categories: buildFacet(categoryFacet.data || [], 'category'),
    };

    return res.json({
      results: data || [],
      total: count || 0,
      page: pageNum,
      pageSize: pageSizeNum,
      facets,
    });
  } catch (err) {
    console.error('Jobs route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/nearby
// Query params: lat, lon, radiusKm (10|25|50|100), limit
// ---------------------------------------------------------------------------
router.get('/nearby', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { lat, lon, radiusKm = '25', limit = '50' } = req.query;

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isFinite(latNum) || latNum < -90 || latNum > 90) {
      return res.status(400).json({ error: 'Invalid lat parameter' });
    }
    if (!isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({ error: 'Invalid lon parameter' });
    }

    let radiusNum = parseInt(radiusKm, 10);
    if (!ALLOWED_RADII.includes(radiusNum)) {
      // Clamp to nearest allowed value
      radiusNum = ALLOWED_RADII.reduce((prev, curr) =>
        Math.abs(curr - radiusNum) < Math.abs(prev - radiusNum) ? curr : prev
      );
    }

    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    // Haversine calculation in SQL via Supabase rpc, falling back to JS filter
    const { data, error } = await supabase.rpc('jobs_nearby', {
      p_lat: latNum,
      p_lon: lonNum,
      p_radius_km: radiusNum,
      p_limit: limitNum,
    });

    if (error) {
      // Fallback: fetch all jobs and filter in JS using Haversine
      const { data: allJobs, error: allErr } = await supabase
        .from('jobs')
        .select('*')
        .not('lat', 'is', null)
        .not('lon', 'is', null);

      if (allErr) {
        console.error('Nearby jobs fallback error:', allErr);
        return res.status(500).json({ error: 'Failed to fetch nearby jobs' });
      }

      const nearby = (allJobs || [])
        .map((job) => ({
          ...job,
          distanceKm: haversineKm(latNum, lonNum, job.lat, job.lon),
        }))
        .filter((job) => job.distanceKm <= radiusNum)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limitNum);

      return res.json({ results: nearby, total: nearby.length });
    }

    return res.json({ results: data || [], total: (data || []).length });
  } catch (err) {
    console.error('Nearby route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/jobs/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Job not found' });
      }
      console.error('Job fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch job' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Job detail route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function buildFacet(rows, field) {
  const counts = {};
  for (const row of rows) {
    const val = row[field];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = router;
