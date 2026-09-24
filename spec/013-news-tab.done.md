# News tab — general + tech news from pluggable sources

## Goal

Add a permanent "News" tab with a **General / Tech** switch. Tech mode keeps the user on top of the tools they use (Snowflake, Claude Code, dbt) plus a handful of top headlines from Hacker News, kode24 and tek.no. General mode shows top stories from NRK and gamer.no. Sources are defined as config and fetched through small adapters, so adding or swapping a news source is a one-line config change (or one new adapter file), never a UI change.

## Context

- Server integration pattern: `server/integrations/weather/{router,service}.js`, mounted in `server/index.js`, responses via `ok`/`err` from `server/lib/response.js`, handlers wrapped in `server/lib/asyncHandler.js`. Server is CommonJS (`server/package.json`), Node 18+ global `fetch`.
- Frontend store pattern: `src/store/weather-store.ts` (Zustand + `persist`, `status` state machine, `partialize`). News changes during the day, so use a **time-based TTL (30 min)** instead of the day-level `fetchedDate` cache used by weather/strava.
- Tabs: `src/components/tab-bar/TabBar.tsx` renders `tabs[]` from `src/store/dashboard-store.ts`; `src/components/layout/AppLayout.tsx` always renders `<Dashboard />`. Spec `005-display-tab.md` (not implemented yet) plans a permanent tab with the reserved id `"__display__"`. This spec uses the same idea with `"__news__"`. If 005 lands first, reuse its routing. If this lands first, 005 should reuse this one's.
- Norwegian sites mostly publish RSS but not always at a guessable URL. **Every feed URL below must be checked with `curl` before merging.** A dead source must never break the tab (see per-source error isolation).
- No XML parser ships with Node. Add `fast-xml-parser` (pure JS, no native build, fine on the Pi) to the root `package.json` dependencies.

### Initial sources

| id | name | category | group | adapter | url | status |
|---|---|---|---|---|---|---|
| `snowflake` | Snowflake | tech | stack | `rss` | `https://docs.snowflake.com/feeds/releases.xml` | check. Fallback: `https://docs.snowflake.com/en/release-notes/new-features` via a future `html` adapter |
| `claude-code` | Claude Code | tech | stack | `rss` | `https://github.com/anthropics/claude-code/releases.atom` | GitHub releases Atom, standard format |
| `dbt-core` | dbt Core | tech | stack | `rss` | `https://github.com/dbt-labs/dbt-core/releases.atom` | GitHub releases Atom |
| `dbt-blog` | dbt Labs blog | tech | stack | `rss` | `https://docs.getdbt.com/blog/rss.xml` | check |
| `hackernews` | Hacker News | tech | headlines | `hackernews` | `https://hacker-news.firebaseio.com/v0` | official API |
| `kode24` | kode24 | tech | headlines | `rss` | `https://rss.kode24.no/` | confirmed via search |
| `tek` | Tek.no | tech | headlines | `rss` | `https://www.tek.no/rss` | check |
| `nrk` | NRK | general | headlines | `rss` | `https://www.nrk.no/toppsaker.rss` | NRK's documented top-stories feed |
| `gamer` | Gamer.no | general | headlines | `rss` | `https://www.gamer.no/rss` | check |

## Affected files

**New files:**
- `server/integrations/news/sources.js`: source config array (the table above)
- `server/integrations/news/adapters/rss.js`: fetches and normalizes RSS 2.0 and Atom feeds
- `server/integrations/news/adapters/hackernews.js`: HN Firebase API adapter
- `server/integrations/news/adapters/index.js`: `{ rss, hackernews }` adapter map
- `server/integrations/news/service.js`: runs sources through adapters, per-source cache, error isolation
- `server/integrations/news/router.js`: `GET /api/news?category=tech|general`
- `server/integrations/news/adapters/rss.test.js`: parser tests with fixture strings (Vitest can import CJS)
- `src/types/news.ts`: shared frontend types
- `src/store/news-store.ts`: selected category plus cached responses per category
- `src/components/news/NewsTab.tsx` + `NewsTab.module.css`: tab view with the switch and source sections
- `src/components/news/NewsSourceSection.tsx`: one source's heading plus item list, or an error row

**Modified files:**
- `server/index.js`: mount `/api/news`, add `news` to `/api/health`
- `package.json`: add `fast-xml-parser`
- `src/components/tab-bar/TabBar.tsx`: permanent, non-removable "News" tab (`"__news__"`)
- `src/components/layout/AppLayout.tsx`: render `<NewsTab />` when `activeTabId === "__news__"`, and hide "+ Add Widget" on that tab
- `ARCHITECTURE.md`: document the news integration and the "add a source" steps

## Implementation

1. **Normalized item shape** (server and `src/types/news.ts`):
   ```ts
   interface NewsItem {
     id: string;            // stable: guid/link/HN id
     title: string;
     url: string;
     publishedAt: string | null;  // ISO
     summary?: string;      // plain text, HTML stripped, max ~200 chars
     score?: number;        // HN points
     commentsUrl?: string;  // HN discussion link
     tags?: string[];       // stack keywords matched in the title (step 6)
   }
   interface NewsSection {
     source: { id: string; name: string; group: "stack" | "headlines"; homepage: string };
     items: NewsItem[];
     error?: string;        // set when this source failed; items is []
     fetchedAt: string;
   }
   interface NewsResponse { category: "tech" | "general"; sections: NewsSection[] }
   ```

2. **Source config** (`sources.js`): export an array of `{ id, name, category, group, adapter, url, homepage, limit }` with `limit` defaulting to 5 (3 for `stack` sources). Adding a source means adding one entry here. Nothing else changes.

3. **Adapters.** Each adapter is `async (source) => NewsItem[]`, and each fetch uses a 10s timeout (`AbortSignal.timeout(10000)`) and the same `User-Agent` style as `weather/service.js`.
   - `rss.js`: parse with `new XMLParser({ ignoreAttributes: false })`. Handle RSS 2.0 (`rss.channel.item[]`: `title`, `link`, `guid`, `pubDate`, `description`) and Atom (`feed.entry[]`: `title`, `link[@_href]` (prefer `rel="alternate"`), `id`, `updated`/`published`, `summary`/`content`). A single item can parse as an object instead of an array, so normalize it. Strip HTML from summaries. Sort by `publishedAt` descending, slice to `limit`.
   - `hackernews.js`: `GET {url}/topstories.json`, take the first `limit` ids, fetch `{url}/item/{id}.json` in parallel. Map `title`, `url` (fall back to the HN item link for Ask HN), `score`, `time`→ISO, `commentsUrl = https://news.ycombinator.com/item?id={id}`.

4. **Service** (`service.js`):
   - `getNews(category)`: filters sources by category and runs them with `Promise.allSettled`. A rejected source becomes a section with `error` set, so **one dead feed never fails the whole response**.
   - In-memory cache per source id with a 15 min TTL. Serve cached items if fresh. If a refetch fails but stale items exist, return them (no error), because stale news beats an error row.
   - `healthCheck()` returns `'ok'`.

5. **Router**: `GET /` validates `category` ∈ `tech|general` (else `err(res, 400, 'BAD_REQUEST', …)`) and returns `ok(res, await service.getNews(category))`. It returns 502 `NEWS_UNAVAILABLE` only if every source fails.

6. **Stack keyword tagging** (cheap, high value): in the service, check headline items against `STACK_KEYWORDS = { snowflake: ['snowflake'], 'claude-code': ['claude code', 'claude'], dbt: ['dbt'] }` with case-insensitive word-boundary matching, and put matches in `tags`. The UI shows these as small accent chips so that, for example, an HN post about dbt stands out. Keep the keyword map in `sources.js` next to the sources.

7. **News store** (`news-store.ts`), following `weather-store.ts`:
   ```ts
   category: "tech" | "general";          // persisted, default "tech"
   data: Partial<Record<Category, NewsResponse>>;
   fetchedAt: Partial<Record<Category, number>>;  // epoch ms
   status: Partial<Record<Category, "idle"|"loading"|"success"|"error">>;
   error: Partial<Record<Category, string|null>>;
   setCategory(c): void;                  // also calls fetchIfNeeded(c)
   fetchIfNeeded(c): void;                // skip if loading or < 30 min old
   refresh(c): void;                      // force
   ```
   Persist key `"news-storage"`. Persist `category`, `data` and `fetchedAt` so the Pi shows the last news instantly after a reload.

8. **Tab plumbing**: in `TabBar.tsx`, render a "News" button after the regular tabs and before `+`. It uses the same `styles.tab`/`styles.tabActive` classes, calls `setActiveTab("__news__")`, and has no × button. In `AppLayout.tsx`, check `activeTabId === "__news__"` to choose `<NewsTab />` over `<Dashboard />`. `removeTab` and `Dashboard` need no changes, because `Dashboard` already returns `null` for an unknown id.

9. **NewsTab UI** (`NewsTab.tsx`, use the `frontend-design` skill, keep the existing terminal/dark aesthetic from `src/index.css`):
   - Top bar: a segmented switch `GENERAL | TECH` (a 2-option radiogroup with `role="radiogroup"` and 44px min height for the Pi touchscreen), a "last updated HH:MM" label and a ↻ refresh button.
   - **Tech view**: two groups. **"Your stack"** first: one compact card per stack source (Snowflake, Claude Code, dbt Core, dbt blog) with its latest 3 entries, showing title and relative date ("2 d ago"), and a subtle "NEW" marker for items under 7 days old. **"Headlines"** below: HN, kode24 and tek sections. HN rows show score and a comments link, and tags render as chips.
   - **General view**: NRK and gamer.no sections using the same `NewsSourceSection` component.
   - Grid: `repeat(auto-fill, minmax(320px, 1fr))`, reusing `Dashboard.module.css` spacing values.
   - Links open with `target="_blank" rel="noopener noreferrer"`.
   - States: a skeleton while the first load runs, a per-section error row ("Couldn't load kode24" plus the source homepage link) when `section.error` is set, and a full-tab error with a retry button only when the whole request failed. Show "No items" for an empty section.
   - Call `fetchIfNeeded(category)` on mount. Also start a `setInterval` every 30 min while the tab is mounted, so the always-on Pi screen stays fresh.

10. **Docs**: in `ARCHITECTURE.md`, add `GET /api/news` to API Routes and a "News Integration" section that explains sources, adapters and the "add a source" recipe: one `sources.js` entry, plus a new file in `adapters/` if the format is new. Tick a new News item in `TODO.md`.

## Testing

- **Unit tests**
  - `rss.js` parses an RSS 2.0 fixture, an Atom (GitHub releases) fixture, and a single-item feed (object instead of array). It strips HTML from summaries and respects `limit` and date ordering.
  - `hackernews.js`: with `fetch` mocked, it maps score, comments URL and the Ask HN url fallback.
  - `service.getNews`: one adapter throws and another resolves, so the response has one `error` section and one populated section. A cache hit within the TTL makes no fetch. A stale fallback returns old items when a refetch fails.
  - Keyword tagging: "dbt" matches "dbt 1.9 released" but not "adbtool". "Snowflake" is case-insensitive.
  - `news-store`: `fetchIfNeeded` skips when data is under 30 min old, and `setCategory` persists.
- **E2E / visual** (mock `/api/news` with `page.route`):
  1. The News tab is visible and has no × button. Clicking it shows the switch with Tech active by default.
  2. Tech view shows the "Your stack" group above "Headlines". Take a screenshot.
  3. Switching to General shows NRK and Gamer sections. Reload and confirm General stays selected.
  4. With one mocked section in error, the other sections still render.
  5. There's no horizontal overflow at 800×480 (Pi display) or 1440×900, and the switch and refresh button are ≥44px.
  6. Switching back to a regular tab shows its widgets unchanged.

## Acceptance criteria

- [ ] Permanent, non-removable "News" tab with a General/Tech switch. The selection persists.
- [ ] Tech view shows Snowflake, Claude Code and dbt updates ("Your stack") plus the top 5 from HN, kode24 and tek.no.
- [ ] General view shows the top 5 from NRK and gamer.no.
- [ ] Sources live only in `server/integrations/news/sources.js`, and adding an RSS/Atom source needs no other code change.
- [ ] One failing source shows an inline error while the rest render.
- [ ] Server caches per source for 15 min. The client refetches after 30 min or on manual refresh.
- [ ] Headlines that mention the stack get a keyword tag chip.
- [ ] Every feed URL was verified live, and non-working ones are replaced or listed as open issues.
- [ ] Unit tests, `npm run lint`, `npm run build` and the `/test` skill pass.

## Open questions / follow-ups

- **"Better" general news.** NRK is a solid base. Candidates to add later, each just a config entry: E24 (`https://e24.no/rss2/`), Aftenposten, BBC World (`https://feeds.bbci.co.uk/news/world/rss.xml`), Reuters (no official public RSS any more). Decide before implementing, or ship NRK + gamer.no first.
- **Snowflake and tek.no/gamer.no without RSS.** If the checks fail, add an `html` adapter (`cheerio` plus a CSS selector in the source config) instead of dropping the source.
- **Read/unread tracking** and a "stack" widget version of this for the Display tab (spec 005) are out of scope.
