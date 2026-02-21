#!/usr/bin/env node
'use strict';

/**
 * Smoke test – calls key API endpoints and reports status.
 * Usage: node scripts/smoke-test.js [BASE_URL]
 * Default BASE_URL: http://localhost:8080
 */

const http = require('http');
const https = require('https');

const BASE = process.argv[2] || 'http://localhost:8080';

const ENDPOINTS = [
  '/health',
  '/api/jobs?pageSize=1',
  '/api/jobs/nearby?lat=28.6139&lon=77.2090&radiusKm=25',
];

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 120) }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

(async () => {
  let allPassed = true;
  console.log(`Smoke testing ${BASE}\n`);
  for (const path of ENDPOINTS) {
    const url = BASE + path;
    try {
      const { status, body } = await get(url);
      const ok = status >= 200 && status < 300;
      console.log(`${ok ? '✅' : '❌'} ${status} ${path}`);
      if (!ok) {
        console.log(`   Body: ${body}`);
        allPassed = false;
      }
    } catch (err) {
      console.log(`❌ FAILED ${path}: ${err.message}`);
      allPassed = false;
    }
  }
  if (!allPassed) {
    process.exit(1);
  }
  console.log('\nAll smoke tests passed.');
})();
