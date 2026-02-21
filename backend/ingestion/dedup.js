'use strict';

/**
 * Deduplication helper.
 * Creates a SHA-256 hash from the normalised job signature (title + org + source_url).
 * If the hash already exists in the jobs table the record is skipped.
 */

const crypto = require('crypto');

/**
 * Build a normalised signature string for a job and return its SHA-256 hex hash.
 * @param {{ title: string, organisation: string, source_url?: string }} job
 * @returns {string}
 */
function buildHash(job) {
  const sig = [
    (job.title || '').toLowerCase().trim().replace(/\s+/g, ' '),
    (job.organisation || '').toLowerCase().trim(),
    (job.source_url || ''),
  ].join('||');
  return crypto.createHash('sha256').update(sig).digest('hex');
}

/**
 * Filter out jobs whose source_hash already exists in the database.
 * @param {import('pg').Pool} pool
 * @param {object[]} jobs  Array of job objects with a `source_hash` field.
 * @returns {Promise<object[]>} Jobs that are not yet in the database.
 */
async function filterNew(pool, jobs) {
  if (!jobs.length) return [];

  const hashes = jobs.map((j) => j.source_hash);
  const result = await pool.query(
    'SELECT source_hash FROM jobs WHERE source_hash = ANY($1)',
    [hashes]
  );
  const existing = new Set(result.rows.map((r) => r.source_hash));
  return jobs.filter((j) => !existing.has(j.source_hash));
}

module.exports = { buildHash, filterNew };
