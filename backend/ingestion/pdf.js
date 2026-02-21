'use strict';

/**
 * PDF ingestion adapter – Phase 1 stub.
 *
 * Downloads a PDF from a given URL and extracts raw text using a naive
 * Buffer-to-string approach.  A proper parser (e.g. pdf-parse) can replace
 * this in Phase 2.
 *
 * The adapter returns a single job object derived from the PDF's filename /
 * URL so that provenance (official_notification_url) is always stored.
 */

const https = require('https');
const http = require('http');
const { buildHash } = require('./dedup');

/**
 * Download raw bytes from a URL.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'jai-bharat/1.0' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

/**
 * Naive text extraction: find printable ASCII sequences of length ≥ 4.
 *
 * **Phase 1 limitation:** Only ASCII printable characters are captured.
 * Hindi and other Indic-script content in PDFs will not be extracted.
 * Phase 2 should replace this with a proper Unicode-aware PDF parser
 * (e.g. pdf-parse or pdfjs-dist) that handles UTF-8 / UTF-16 encoded PDFs.
 *
 * @param {Buffer} buf
 * @returns {string}
 */
function extractTextNaive(buf) {
  const str = buf.toString('latin1');
  const matches = str.match(/[\x20-\x7E]{4,}/g) || [];
  return matches.join(' ').substring(0, 2000);
}

/**
 * Ingest a PDF from a URL.
 * @param {string} pdfUrl       Direct URL to the PDF file.
 * @param {{ id: string, config: object }} source  Source descriptor.
 * @returns {Promise<object[]>}  Array with a single job stub.
 */
async function ingestPDF(pdfUrl, source) {
  const buf = await downloadBuffer(pdfUrl);
  const rawText = extractTextNaive(buf);

  // Derive a best-effort title from the URL filename
  const filename = pdfUrl.split('/').pop().replace(/[_-]/g, ' ').replace(/\.pdf$/i, '');
  const title = filename.length > 5 ? filename : `Notification from ${source.config.defaultOrg || 'Government'}`;

  const job = {
    title,
    organisation: source.config.defaultOrg || 'Government of India',
    source_url: pdfUrl,
    official_notification_url: pdfUrl,
    description: rawText,
    category: source.config.defaultCategory || null,
    status: 'open',
    published_at: new Date(),
  };
  job.source_hash = buildHash(job);
  return [job];
}

module.exports = { ingestPDF };
