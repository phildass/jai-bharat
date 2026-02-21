'use strict';

/**
 * Ingestion runner – config-driven orchestrator.
 *
 * Usage:
 *   node backend/ingestion/runner.js
 *
 * Reads sources from sources.json, invokes the appropriate adapter,
 * deduplicates, and bulk-inserts new jobs into the database.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const sources = require('./sources.json');
const { ingestRSS }  = require('./rss');
const { ingestHTML } = require('./html');
const { ingestPDF }  = require('./pdf');
const { filterNew }  = require('./dedup');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Insert a batch of new (already deduped) jobs.
 * @param {object[]} jobs
 */
async function bulkInsert(jobs) {
  for (const job of jobs) {
    await pool.query(
      `INSERT INTO jobs
         (title, organisation, source_url, official_notification_url,
          source_hash, category, status, state, district, description,
          published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (source_hash) DO NOTHING`,
      [
        job.title,
        job.organisation,
        job.source_url || null,
        job.official_notification_url || null,
        job.source_hash,
        job.category || null,
        job.status || 'open',
        job.state || null,
        job.district || null,
        job.description || null,
        job.published_at || new Date(),
      ]
    );
  }
}

async function run() {
  const activeSources = sources.sources.filter((s) => s.active);
  console.log(`Running ingestion for ${activeSources.length} active source(s)…`);

  for (const source of activeSources) {
    console.log(`  → [${source.type.toUpperCase()}] ${source.name}`);
    try {
      let jobs = [];

      if (source.type === 'rss') {
        jobs = await ingestRSS(source);
      } else if (source.type === 'html') {
        jobs = await ingestHTML(source);
      } else if (source.type === 'pdf') {
        // PDF sources list PDF URLs in config.pdfUrls[]
        const pdfUrls = source.config.pdfUrls || [];
        for (const url of pdfUrls) {
          const pdfJobs = await ingestPDF(url, source);
          jobs.push(...pdfJobs);
        }
      }

      const newJobs = await filterNew(pool, jobs);
      if (newJobs.length) {
        await bulkInsert(newJobs);
        console.log(`     Inserted ${newJobs.length} new job(s).`);
      } else {
        console.log(`     No new jobs.`);
      }
    } catch (err) {
      console.error(`     Error processing source "${source.name}":`, err.message);
    }
  }

  await pool.end();
  console.log('Ingestion complete.');
}

run().catch((err) => {
  console.error('Ingestion runner failed:', err);
  process.exit(1);
});
