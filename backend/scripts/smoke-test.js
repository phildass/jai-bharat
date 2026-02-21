/**
 * Smoke test – verifies that all Jobs & Geo endpoints return non-empty responses.
 *
 * Usage (requires the backend server to be running):
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.js
 *
 * Exits 0 on success, 1 on failure.
 */

'use strict';

require('dotenv').config({ path: '../.env' });

const https = require('https');
const http  = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log(`\nSmoke tests against ${BASE_URL}\n`);

  // ── GET /api/jobs ──────────────────────────────────────────────────────────
  console.log('GET /api/jobs');
  {
    const r = await get('/api/jobs');
    assert('status 200', r.status === 200, `got ${r.status}`);
    assert('has jobs array', Array.isArray(r.body.jobs), JSON.stringify(r.body).slice(0, 80));
    assert('has total', typeof r.body.total === 'number');
    assert('has facets', r.body.facets && typeof r.body.facets === 'object');
  }

  // ── GET /api/jobs?q=Engineer ───────────────────────────────────────────────
  console.log('\nGET /api/jobs?q=Engineer');
  {
    const r = await get('/api/jobs?q=Engineer');
    assert('status 200', r.status === 200, `got ${r.status}`);
    assert('returns array', Array.isArray(r.body.jobs));
  }

  // ── GET /api/jobs?state=Maharashtra ───────────────────────────────────────
  console.log('\nGET /api/jobs?state=Maharashtra');
  {
    const r = await get('/api/jobs?state=Maharashtra');
    assert('status 200', r.status === 200, `got ${r.status}`);
    assert('only Maharashtra results',
      r.body.jobs.every((j) => j.state === 'Maharashtra'),
      'found jobs from other states'
    );
  }

  // ── GET /api/jobs/:id (first job from list) ────────────────────────────────
  console.log('\nGET /api/jobs (get first id)');
  let firstId;
  {
    const r = await get('/api/jobs?limit=1');
    firstId = r.body.jobs && r.body.jobs[0] && r.body.jobs[0].id;
    assert('has at least one job', Boolean(firstId), 'no jobs in DB (run seed first)');
  }

  if (firstId) {
    console.log(`\nGET /api/jobs/${firstId}`);
    const r = await get(`/api/jobs/${firstId}`);
    assert('status 200', r.status === 200, `got ${r.status}`);
    assert('has title', typeof r.body.title === 'string');
  }

  // ── GET /api/jobs/:id with bad UUID ───────────────────────────────────────
  console.log('\nGET /api/jobs/bad-uuid');
  {
    const r = await get('/api/jobs/bad-uuid');
    assert('status 400', r.status === 400, `got ${r.status}`);
  }

  // ── GET /api/jobs/nearby ───────────────────────────────────────────────────
  console.log('\nGET /api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=500');
  {
    const r = await get('/api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=500');
    assert('status 200', r.status === 200, `got ${r.status}`);
    assert('has jobs array', Array.isArray(r.body.jobs));
    assert('has lat/lon/radiusKm', r.body.lat !== undefined && r.body.lon !== undefined);
    if (r.body.jobs.length > 0) {
      assert('first job has distanceKm', typeof r.body.jobs[0].distanceKm === 'number');
    }
  }

  // ── GET /api/jobs/nearby – missing params ─────────────────────────────────
  console.log('\nGET /api/jobs/nearby (missing lat/lon)');
  {
    const r = await get('/api/jobs/nearby');
    assert('status 400', r.status === 400, `got ${r.status}`);
  }

  // ── GET /api/geo/reverse ──────────────────────────────────────────────────
  console.log('\nGET /api/geo/reverse?lat=28.6139&lon=77.2090');
  {
    const r = await get('/api/geo/reverse?lat=28.6139&lon=77.2090');
    // 503 if LOCATIONIQ_API_KEY not set; 200 if it is
    assert(
      'status 200 or 503',
      r.status === 200 || r.status === 503,
      `got ${r.status}`
    );
    if (r.status === 200) {
      assert('has displayName or state', r.body.displayName || r.body.state);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Smoke test error:', err.message);
  process.exit(1);
});
