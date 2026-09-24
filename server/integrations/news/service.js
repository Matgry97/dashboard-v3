const { SOURCES, STACK_KEYWORDS } = require('./sources');
const defaultAdapters = require('./adapters');

const CACHE_TTL_MS = 15 * 60 * 1000;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KEYWORD_PATTERNS = Object.entries(STACK_KEYWORDS).map(([tag, words]) => ({
  tag,
  re: new RegExp(`\\b(${words.map(escapeRegExp).join('|')})\\b`, 'i'),
}));

/** Tags for stack keywords mentioned in a title. */
function matchTags(title) {
  return KEYWORD_PATTERNS.filter(({ re }) => re.test(title)).map(({ tag }) => tag);
}

/**
 * Creates a news service. Dependencies are injectable for tests.
 */
function createNewsService({
  sources = SOURCES,
  adapters = defaultAdapters,
  now = () => Date.now(),
  ttlMs = CACHE_TTL_MS,
} = {}) {
  const cache = new Map(); // sourceId -> { items, fetchedAt }

  async function loadSource(source) {
    const cached = cache.get(source.id);
    if (cached && now() - cached.fetchedAt < ttlMs) return cached;

    const adapter = adapters[source.adapter];
    if (!adapter) throw new Error(`Unknown adapter "${source.adapter}"`);

    try {
      const items = (await adapter(source)).map((item) => {
        if (source.group !== 'headlines') return item;
        const tags = matchTags(item.title);
        return tags.length ? { ...item, tags } : item;
      });
      const entry = { items, fetchedAt: now() };
      cache.set(source.id, entry);
      return entry;
    } catch (e) {
      // Stale news beats an error row
      if (cached) return cached;
      throw e;
    }
  }

  async function getNews(category) {
    const selected = sources.filter((s) => s.category === category);
    const results = await Promise.allSettled(selected.map(loadSource));

    const sections = selected.map((source, i) => {
      const r = results[i];
      const meta = {
        id: source.id,
        name: source.name,
        group: source.group,
        homepage: source.homepage,
      };
      if (r.status === 'fulfilled') {
        return {
          source: meta,
          items: r.value.items,
          fetchedAt: new Date(r.value.fetchedAt).toISOString(),
        };
      }
      console.warn(`[news] ${source.id} failed: ${r.reason?.message}`);
      return {
        source: meta,
        items: [],
        error: r.reason?.message || 'Failed to load',
        fetchedAt: new Date(now()).toISOString(),
      };
    });

    return { category, sections };
  }

  function healthCheck() {
    return 'ok';
  }

  return { getNews, healthCheck };
}

const defaultService = createNewsService();

module.exports = {
  ...defaultService,
  createNewsService,
  matchTags,
};
