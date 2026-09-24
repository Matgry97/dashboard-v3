const { SOURCES, STACK_KEYWORDS } = require('./sources');
const defaultAdapters = require('./adapters');

const CACHE_TTL_MS = 15 * 60 * 1000;
/** After a failed fetch, don't retry that source for this long. */
const FAILURE_TTL_MS = 2 * 60 * 1000;
/** `fresh` requests can bypass the cache at most this often per source. */
const MIN_REFRESH_MS = 60 * 1000;
/** Serve last good items for a failing source for at most this long. */
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

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

/** Returns the URL if it is absolute http(s), else null. Blocks javascript:, data:, etc. */
function safeUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Drops items without a safe link; strips unsafe optional links. */
function sanitizeItems(items) {
  return items.flatMap((item) => {
    const url = safeUrl(item.url);
    if (!url) return [];
    const clean = { ...item, url };
    if ('commentsUrl' in clean) {
      const commentsUrl = safeUrl(clean.commentsUrl);
      if (commentsUrl) clean.commentsUrl = commentsUrl;
      else delete clean.commentsUrl;
    }
    return [clean];
  });
}

/**
 * Creates a news service. Dependencies are injectable for tests.
 */
function createNewsService({
  sources = SOURCES,
  adapters = defaultAdapters,
  now = () => Date.now(),
  ttlMs = CACHE_TTL_MS,
  failureTtlMs = FAILURE_TTL_MS,
  minRefreshMs = MIN_REFRESH_MS,
  maxStaleMs = MAX_STALE_MS,
} = {}) {
  const cache = new Map(); // sourceId -> { items, fetchedAt } (last good fetch)
  const failures = new Map(); // sourceId -> { at, error }
  const inflight = new Map(); // sourceId -> Promise<entry>

  /** Last good items marked stale, if not too old; otherwise rethrow. */
  function fallback(sourceId, error) {
    const cached = cache.get(sourceId);
    if (cached && now() - cached.fetchedAt < maxStaleMs) return { ...cached, stale: true };
    throw error;
  }

  async function fetchSource(source) {
    const adapter = adapters[source.adapter];
    try {
      if (!adapter) throw new Error(`Unknown adapter "${source.adapter}"`);
      const items = sanitizeItems(await adapter(source)).map((item) => {
        if (source.group !== 'headlines') return item;
        const tags = matchTags(item.title);
        return tags.length ? { ...item, tags } : item;
      });
      const entry = { items, fetchedAt: now() };
      cache.set(source.id, entry);
      failures.delete(source.id);
      return entry;
    } catch (e) {
      failures.set(source.id, { at: now(), error: e });
      return fallback(source.id, e);
    }
  }

  async function loadSource(source, { fresh = false } = {}) {
    const t = now();
    const cached = cache.get(source.id);
    const failure = failures.get(source.id);
    const lastAttempt = Math.max(cached?.fetchedAt ?? -Infinity, failure?.at ?? -Infinity);
    const forced = fresh && t - lastAttempt >= minRefreshMs;

    if (!forced) {
      if (cached && t - cached.fetchedAt < ttlMs && !failure) return cached;
      if (failure && t - failure.at < failureTtlMs) return fallback(source.id, failure.error);
    }

    // Concurrent requests share one upstream fetch
    if (!inflight.has(source.id)) {
      inflight.set(
        source.id,
        fetchSource(source).finally(() => inflight.delete(source.id))
      );
    }
    return inflight.get(source.id);
  }

  async function getNews(category, { fresh = false } = {}) {
    const selected = sources.filter((s) => s.category === category);
    const results = await Promise.allSettled(selected.map((s) => loadSource(s, { fresh })));

    const sections = selected.map((source, i) => {
      const r = results[i];
      const meta = {
        id: source.id,
        name: source.name,
        group: source.group,
        homepage: source.homepage,
      };
      if (r.status === 'fulfilled') {
        const section = {
          source: meta,
          items: r.value.items,
          fetchedAt: new Date(r.value.fetchedAt).toISOString(),
        };
        if (r.value.stale) section.stale = true;
        return section;
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
  safeUrl,
};
