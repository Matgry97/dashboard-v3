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
│   garmin/   │ │  weather/  │  ...
│  router.js  │ │  router.js │
│  service.js │ │  service.js│
└──────┬──────┘ └──────┬─────┘
       │               │
       │        ┌──────▼──────────────────┐
       │        │  Open-Meteo API (HTTP)  │
       │        └─────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│  GarminDB SQLite  ~/HealthData/DBs/ │
│  garmin_activities.db               │
└─────────────────────────────────────┘
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
│   └── last-workout/               # Garmin last workout widget
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
- **better-sqlite3** — synchronous SQLite reads, no ORM
- CommonJS modules (no build step needed for the server)

### File Structure

```
server/
├── index.js                        # Express app: mounts integrations, serves static build
├── lib/
│   ├── asyncHandler.js             # Wraps async route handlers, forwards errors to Express
│   └── response.js                 # Consistent { ok, data } / { ok, error, message } envelope
└── integrations/
    ├── garmin/
    │   ├── router.js               # Express router — HTTP only, no business logic
    │   └── service.js              # Reads SQLite, shells out to garmindb_cli
    ├── weather/
    │   ├── router.js               # GET /current
    │   └── service.js              # Fetches Open-Meteo API, returns current + forecast data
    └── [next-integration]/
        ├── router.js
        └── service.js
```

### API Routes

```
GET  /api/health                         # Status of all integrations
GET  /api/garmin/last-workout            # Latest activity from SQLite
POST /api/garmin/sync                    # Runs garmindb_cli --latest, returns fresh data
GET  /api/weather/current               # Current weather + forecast from Open-Meteo (lat/lon via .env)
```

### Response Envelope

All endpoints return the same shape so frontend code is predictable:

```json
{ "ok": true, "data": { ... } }

{ "ok": false, "error": "DB_NOT_FOUND", "message": "No SQLite file at ~/HealthData/DBs/" }
{ "ok": false, "error": "SYNC_FAILED",  "message": "garmindb_cli exited with code 1" }
{ "ok": false, "error": "UNAVAILABLE",  "message": "..." }
```

Widgets check `ok` before rendering. On `ok: false`, show the error message with a retry button.

### Health Endpoint

`GET /api/health` aggregates a `healthCheck()` call from each integration:

```json
{
  "garmin": "ok",
  "someOtherIntegration": "unavailable"
}
```

### Adding a New Integration

1. Create `server/integrations/[name]/service.js` — all logic, no HTTP
2. Create `server/integrations/[name]/router.js` — mount routes, call service
3. In `server/index.js`, add: `app.use('/api/[name]', require('./integrations/[name]/router'))`
4. Create the corresponding widget in `src/widgets/[name]/`

---

## Garmin Integration

### Prerequisites (one-time setup on Pi or dev machine)

```bash
pip install garmindb
# Configure credentials:
cp ~/.GarminDb/GarminConnectConfig.json.example ~/.GarminDb/GarminConnectConfig.json
# Edit the file and add your Garmin Connect username/password and start dates

# Initial data download:
garmindb_cli.py --activities --download --import --analyze
```

### Data Source

GarminDB stores activity data in SQLite at `~/HealthData/DBs/garmin_activities.db`.

Relevant table: `activities`

| Column        | Type    | Description                    |
|---------------|---------|--------------------------------|
| activity_id   | String  | Primary key                    |
| name          | String  | Activity name from Garmin      |
| sport         | String  | running, cycling, walking, etc.|
| sub_sport     | String  | e.g. indoor_cycling            |
| start_time    | DateTime|                                |
| elapsed_time  | Time    | Total duration                 |
| moving_time   | Time    | Time actually moving           |
| distance      | Float   | km or miles                    |
| calories      | Integer |                                |
| avg_hr        | Integer | beats per minute               |
| max_hr        | Integer |                                |
| avg_speed     | Float   | kmph or mph                    |
| ascent        | Float   | feet or meters                 |
| training_effect | Float |                               |

### Sync Strategy

| Phase    | How data stays fresh                                    |
|----------|---------------------------------------------------------|
| Now      | "Sync" button in widget calls `POST /api/garmin/sync`   |
| Later    | Cron job on Pi runs `garmindb_cli.py --latest`          |

The widget always fetches on mount. The sync button exists for manual refresh.
The cron job replaces the need to press the button.

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

### Keeping Data Fresh

```bash
# Manual sync
garmindb_cli.py --activities --download --import --analyze --latest

# Or hit the sync button in the widget
# Or set up a cron job:
# 0 * * * * garmindb_cli.py --activities --download --import --analyze --latest
```
