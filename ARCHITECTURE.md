# Architecture

A personal dashboard built with React on the frontend and a lightweight Node.js/Express backend for integrations with external data sources. Designed to run on a Raspberry Pi as a always-on home dashboard.

---

## Overview

```
┌─────────────────────────────────────┐
│          React Frontend             │
│  (Vite, React 19, Zustand, CSS Mod) │
└────────────────┬────────────────────┘
                 │ fetch /api/*
┌────────────────▼────────────────────┐
│         Express Server              │
│         server/index.js             │
└──────┬──────────────┬───────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────┐
│   strava/   │ │  weather/  │  ...
│  router.js  │ │  router.js │
│  service.js │ │  service.js│
└──────┬──────┘ └──────┬─────┘
       │               │
┌──────▼──────────┐ ┌──▼──────────────────────┐
│  Strava API     │ │  Open-Meteo API (HTTP)  │
└─────────────────┘ └─────────────────────────┘
```

In development: Vite dev server proxies `/api/*` to Express.
In production (Pi): Express serves the built React app as static files and handles all API routes.

---

## Frontend

### Stack

- **React 19** with TypeScript
- **Vite** — dev server and build tool
- **Zustand** — client state and localStorage persistence
- **CSS Modules** — scoped component styles
- **Vitest** — unit tests

### File Structure

```
src/
├── main.tsx                        # Entry point
├── App.tsx                         # Imports widget barrel, renders AppLayout
├── index.css                       # Global CSS reset and dark theme variables
├── test-setup.ts                   # Vitest setup (localStorage mock)
│
├── types/
│   ├── widget.ts                   # WidgetDefinition, WidgetComponentProps, WidgetSize
│   └── dashboard.ts                # WidgetInstance, DashboardTab
│
├── store/
│   ├── dashboard-store.ts          # Tabs, widgets, persistence to localStorage
│   ├── strava-store.ts             # Last run data, day-level cache
│   ├── news-store.ts               # Selected news category + per-category cache (30 min TTL)
│   └── weather-store.ts            # Current weather + forecast, day-level cache
│
├── registry/
│   └── widget-registry.ts          # Map<id, WidgetDefinition> — register/get/getAll
│
├── utils/
│   └── id.ts                       # crypto.randomUUID() helper
│
├── widgets/
│   ├── index.ts                    # Barrel — side-effect imports trigger registration
│   ├── clock/
│   ├── weather/
│   ├── weather-forecast/
│   └── last-workout/               # Strava last run widget
│
└── components/
    ├── layout/AppLayout.tsx         # Header + TabBar + Dashboard + WidgetPicker toggle
    ├── dashboard/Dashboard.tsx      # 3-column CSS grid of widgets (regular tabs)
    ├── display/DisplayTab.tsx       # Fixed curated layout for touch display (planned)
    ├── news/NewsTab.tsx             # Permanent News tab: General/Tech switch + source sections
    ├── widget-shell/WidgetShell.tsx # Chrome: title bar, remove button, grid sizing
    ├── widget-picker/WidgetPicker.tsx
    └── tab-bar/TabBar.tsx
```

### Widget Pattern

Each widget is a self-contained folder under `src/widgets/`:

```
src/widgets/my-widget/
├── MyWidget.tsx           # React component
├── MyWidget.module.css    # Scoped styles
└── index.ts               # Calls registerWidget(), imported by widgets/index.ts
```

Widgets register themselves as a side-effect of import. The registry is a plain
`Map<string, WidgetDefinition>` — no React context needed.

### Widget UI States

Every widget that fetches data must handle three states:

- **Loading** — show a skeleton or spinner
- **Error** — show a message and a retry/sync button (e.g. "Service unavailable")
- **Data** — render the content

---

## Backend (server/)

### Stack

- **Node.js** with **Express**
- CommonJS modules (no build step needed for the server)

### File Structure

```
server/
├── index.js                        # Express app: mounts integrations, serves static build
├── lib/
│   ├── asyncHandler.js             # Wraps async route handlers, forwards errors to Express
│   └── response.js                 # Consistent { ok, data } / { ok, error, message } envelope
└── integrations/
    ├── strava/
    │   ├── router.js               # GET /last-run, POST /sync
    │   └── service.js              # Fetches Strava API, handles token refresh
    ├── weather/
    │   ├── router.js               # GET /current
    │   └── service.js              # Fetches Open-Meteo API, returns current + forecast data
    ├── news/
    │   ├── sources.js              # News source config + stack keywords
    │   ├── adapters/               # rss.js (RSS/Atom), hackernews.js — one per feed format
    │   ├── router.js               # GET /?category=tech|general
    │   └── service.js              # Runs sources through adapters, per-source cache + isolation
    ├── steam/                          # Planned: last played game, last achievement
    │   ├── router.js
    │   └── service.js
    └── [next-integration]/
        ├── router.js
        └── service.js
```

### API Routes

```
GET  /api/health                    # Status of all integrations
GET  /api/strava/last-run           # Latest run from Strava API
POST /api/strava/sync               # Force-refresh from Strava, returns fresh data
GET  /api/weather/current           # Current weather + forecast from Open-Meteo (lat/lon via .env)
GET  /api/news?category=tech        # News sections for a category (tech | general)
```

### Response Envelope

All endpoints return the same shape so frontend code is predictable:

```json
{ "ok": true, "data": { ... } }

{ "ok": false, "error": "STRAVA_ERROR", "message": "..." }
{ "ok": false, "error": "UNAVAILABLE",  "message": "..." }
```

Widgets check `ok` before rendering. On `ok: false`, show the error message with a retry button.

### Health Endpoint

`GET /api/health` aggregates a `healthCheck()` call from each integration:

```json
{
  "strava": "ok",
  "weather": "ok"
}
```

### Adding a New Integration

1. Create `server/integrations/[name]/service.js` — all logic, no HTTP
2. Create `server/integrations/[name]/router.js` — mount routes, call service
3. In `server/index.js`, add: `app.use('/api/[name]', require('./integrations/[name]/router'))`
4. Create the corresponding widget in `src/widgets/[name]/`

---

## Strava Integration

### Setup (one-time)

1. Create a Strava API app at https://www.strava.com/settings/api
2. Set Authorization Callback Domain to `localhost`
3. Do the OAuth flow to get a refresh token
4. Add to `.env`: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`

### Auth Flow

Strava uses OAuth2. The refresh token never expires — the service exchanges it for a
fresh access token on each request (access tokens expire after 6 hours).

### Data

The `/last-run` endpoint returns the most recent activity with `type = 'Run'` from
`/api/v3/athlete/activities`.

---

## Running

### Development

```bash
# Terminal 1 — frontend with HMR
npm run dev

# Terminal 2 — backend
node server/index.js
```

Vite proxies `/api/*` to the Express server (configured in `vite.config.ts`).

### Production (Raspberry Pi)

```bash
npm run build          # Outputs to dist/
node server/index.js   # Serves dist/ as static + handles /api/*
```

Run as a systemd service for auto-start on boot.

---

## News Integration

The permanent **News** tab (`activeTabId === "__news__"`, not part of `tabs[]`) has a
General / Tech switch. Tech shows "Your stack" (Snowflake, Claude Code, dbt release
notes) above "Headlines" (Hacker News, kode24, tek.no). General shows NRK and gamer.no.

The backend is source-agnostic:

- **Sources** are plain config in `server/integrations/news/sources.js`:
  `{ id, name, category, group, adapter, url, homepage, limit }`.
- **Adapters** (`adapters/`) turn a source into normalized items:
  `{ id, title, url, publishedAt, summary?, score?, commentsUrl? }`.
  `rss` handles RSS 2.0, RSS 1.0 and Atom (incl. GitHub `releases.atom`); `hackernews`
  uses the official Firebase API.
- **Service** fetches each source independently (`Promise.allSettled`) — one dead feed
  shows an inline error, the rest still render. Each source is cached in memory for
  15 min; if a refetch fails, stale items are served instead of an error.
- Headlines mentioning a `STACK_KEYWORDS` term get a tag chip.

### Adding a news source

1. Has RSS/Atom → add one entry to `SOURCES` in `sources.js`. Done.
2. Different format → add `adapters/[name].js` exporting `async (source) => NewsItem[]`,
   register it in `adapters/index.js`, then add the source entry.

---

## Display Tab

A dedicated tab within the existing dashboard designed for always-on, touch-first use on a Raspberry Pi touchscreen.

### Goals
- Glanceable at a distance — large text, high contrast, minimal chrome
- Touch-optimized — minimum 44px tap targets, no hover-only interactions
- Curated fixed layout — not the same editable grid as regular tabs

### Implementation Plan
- New tab type in the dashboard store (`type: "display"`)
- `DisplayTab` component with its own layout (no WidgetShell drag/resize controls)
- Toggle panel to configure which widgets appear — simple on/off list, persisted separately
- Display config stored in Zustand alongside regular tab config

---

## Planned Integrations

### Strava Weekly Stats
Reuses the existing Strava token. New endpoint `GET /api/strava/weekly` aggregates
activity data for the current week (total distance, time, runs).

### Steam / Xbox
Last played game and last earned achievement. Same router + service pattern.
Steam: public API with API key. Xbox: OAuth2 with Xbox Live API.

### AI Workout Suggestion
Tap-to-generate widget. Sends a prompt to the Claude API containing:
- Last N runs from Strava (distance, pace, HR, elevation)
- 7-day weather forecast from Open-Meteo
- User context (e.g. target weekly km)

Returns a structured weekly plan. Not auto-generated — always manual trigger to
avoid unnecessary API usage.
