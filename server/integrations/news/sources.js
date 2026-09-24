/**
 * News sources. Adding a source = adding an entry here.
 * `adapter` must be a key in ./adapters/index.js.
 *
 * category: which switch position shows it ("tech" | "general")
 * group:    "stack" (tools you use — release notes) | "headlines" (top stories)
 */
const SOURCES = [
  // --- Tech: your stack ---
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'tech',
    group: 'stack',
    adapter: 'rss',
    url: 'https://docs.snowflake.com/feeds/releases.xml',
    homepage: 'https://docs.snowflake.com/en/release-notes/all-release-notes',
    limit: 3,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    category: 'tech',
    group: 'stack',
    adapter: 'rss',
    url: 'https://github.com/anthropics/claude-code/releases.atom',
    homepage: 'https://github.com/anthropics/claude-code/releases',
    limit: 3,
  },
  {
    id: 'dbt-core',
    name: 'dbt Core',
    category: 'tech',
    group: 'stack',
    adapter: 'rss',
    url: 'https://github.com/dbt-labs/dbt-core/releases.atom',
    homepage: 'https://github.com/dbt-labs/dbt-core/releases',
    limit: 3,
  },
  {
    id: 'dbt-blog',
    name: 'dbt Labs blog',
    category: 'tech',
    group: 'stack',
    adapter: 'rss',
    url: 'https://docs.getdbt.com/blog/rss.xml',
    homepage: 'https://docs.getdbt.com/blog',
    limit: 3,
  },

  // --- Tech: headlines ---
  {
    id: 'hackernews',
    name: 'Hacker News',
    category: 'tech',
    group: 'headlines',
    adapter: 'hackernews',
    url: 'https://hacker-news.firebaseio.com/v0',
    homepage: 'https://news.ycombinator.com/',
    limit: 5,
  },
  {
    id: 'kode24',
    name: 'kode24',
    category: 'tech',
    group: 'headlines',
    adapter: 'rss',
    url: 'https://rss.kode24.no/',
    homepage: 'https://www.kode24.no/',
    limit: 5,
  },
  {
    id: 'tek',
    name: 'Tek.no',
    category: 'tech',
    group: 'headlines',
    adapter: 'rss',
    url: 'https://www.tek.no/rss',
    homepage: 'https://www.tek.no/',
    limit: 5,
  },

  // --- General ---
  {
    id: 'nrk',
    name: 'NRK',
    category: 'general',
    group: 'headlines',
    adapter: 'rss',
    url: 'https://www.nrk.no/toppsaker.rss',
    homepage: 'https://www.nrk.no/',
    limit: 5,
  },
  {
    id: 'gamer',
    name: 'Gamer.no',
    category: 'general',
    group: 'headlines',
    adapter: 'rss',
    url: 'https://www.gamer.no/rss',
    homepage: 'https://www.gamer.no/',
    limit: 5,
  },
];

/** Headlines mentioning these get a tag chip, so stack news stands out. */
const STACK_KEYWORDS = {
  snowflake: ['snowflake'],
  claude: ['claude code', 'claude'],
  dbt: ['dbt'],
};

const CATEGORIES = ['tech', 'general'];

module.exports = { SOURCES, STACK_KEYWORDS, CATEGORIES };
