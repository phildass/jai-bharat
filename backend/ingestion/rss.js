'use strict';

/**
 * RSS ingestion adapter.
 * Fetches an RSS feed and returns normalised job objects.
 *
 * Requires: rss-parser (npm install rss-parser)
 */

const RSSParser = require('rss-parser');
const { buildHash } = require('./dedup');

const parser = new RSSParser();

/**
 * Fetch and parse an RSS source.
 * @param {{ id: string, base_url: string, config: object }} source
 * @returns {Promise<object[]>}
 */
async function ingestRSS(source) {
  const feed = await parser.parseURL(source.base_url);

  return (feed.items || []).map((item) => {
    const job = {
      title: item[source.config.titleField || 'title'] || '',
      organisation: source.config.defaultOrg || feed.title || 'Unknown',
      source_url: item[source.config.linkField || 'link'] || source.base_url,
      official_notification_url: item.link || null,
      description: item[source.config.descriptionField || 'contentSnippet'] || item.content || '',
      state: source.config.defaultState || null,
      category: source.config.defaultCategory || null,
      status: 'open',
      published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
    };
    job.source_hash = buildHash(job);
    return job;
  });
}

module.exports = { ingestRSS };
