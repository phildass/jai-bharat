#!/usr/bin/env node
'use strict';

/**
 * Seed script: inserts ~50 sample government jobs into the jobs table.
 * Usage:  cd backend && node scripts/seedJobs.js
 * Or:     npm run seed
 *
 * Safe to run multiple times (ON CONFLICT DO NOTHING based on title+state).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const SAMPLE_JOBS = require('./sampleJobs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log(`Seeding ${SAMPLE_JOBS.length} jobs...`);
  let inserted = 0;
  let skipped = 0;

  for (const job of SAMPLE_JOBS) {
    const result = await pool.query(
      `INSERT INTO jobs
         (title, department, source, apply_url, notification_pdf_url,
          state, district, city, location_text, lat, lon, posted_at, last_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (title, state, district) DO NOTHING
       RETURNING id`,
      [
        job.title, job.department, job.source, job.apply_url,
        job.notification_pdf_url || null, job.state, job.district,
        job.city || null, job.location_text, job.lat, job.lon,
        job.posted_at, job.last_date,
      ]
    );
    if (result.rowCount > 0) {
      inserted++;
      console.log(`  [+] ${job.title} (${job.city || job.district}, ${job.state})`);
    } else {
      skipped++;
      console.log(`  [=] Skipped (already exists): ${job.title}`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  pool.end();
  process.exit(1);
});
