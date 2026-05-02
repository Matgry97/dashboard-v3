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
│   └── dashboard-store.ts          # Tabs, widgets, persistence to localStorage
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
    ├── dashboard/Dashboard.tsx      # 3-column CSS grid of widgets
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
