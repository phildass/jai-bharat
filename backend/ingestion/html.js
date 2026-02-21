'use strict';

/**
 * HTML list-page ingestion adapter.
 * Fetches an HTML page and extracts job listings using CSS selectors.
 *
 * Requires: node-html-parser (npm install node-html-parser)
 */

const https = require('https');
const http = require('http');
const { parse } = require('node-html-parser');
const { buildHash } = require('./dedup');

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'jai-bharat/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Fetch and parse an HTML job list page.
 * @param {{ id: string, base_url: string, config: object }} source
 * @returns {Promise<object[]>}
 */
async function ingestHTML(source) {
  const html = await fetchHTML(source.base_url);
  const root = parse(html);
  const cfg = source.config || {};

  const items = root.querySelectorAll(cfg.listSelector || '.job-item');

  return items.map((el) => {
    const titleEl = cfg.titleSelector ? el.querySelector(cfg.titleSelector) : el;
    const orgEl   = cfg.orgSelector   ? el.querySelector(cfg.orgSelector) : null;
    const linkEl  = cfg.linkSelector  ? el.querySelector(cfg.linkSelector) : null;

    const title = titleEl ? titleEl.text.trim() : el.text.trim();
    const organisation = orgEl ? orgEl.text.trim() : (cfg.defaultOrg || 'Unknown');
    const href = linkEl ? linkEl.getAttribute('href') : null;
    const sourceUrl = href
      ? (href.startsWith('http') ? href : new URL(href, source.base_url).toString())
      : source.base_url;

    const job = {
      title,
      organisation,
      source_url: sourceUrl,
      official_notification_url: sourceUrl,
      state: cfg.defaultState || null,
      category: cfg.defaultCategory || null,
      status: 'open',
      published_at: new Date(),
    };
    job.source_hash = buildHash(job);
    return job;
  }).filter((j) => j.title.length > 0);
}

module.exports = { ingestHTML };
