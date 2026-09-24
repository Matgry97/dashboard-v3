/**
 * Adapter registry. Each adapter: async (source) => NewsItem[]
 * NewsItem: { id, title, url, publishedAt, summary?, score?, commentsUrl? }
 */
const { rss } = require('./rss');
const { hackernews } = require('./hackernews');

module.exports = { rss, hackernews };
