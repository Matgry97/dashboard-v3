# Raspberry Pi deployment setup

## Goal

Configure the dashboard for production deployment on a Raspberry Pi. This means: a production build of the React frontend served as static files by Express, a systemd service so the server starts on boot, and documented environment setup. After this spec, deploying to a Pi should be a matter of cloning the repo, adding `.env`, and enabling the service.

## Context

- The architecture doc describes production mode: `npm run build` outputs to `dist/`, Express serves `dist/` as static files and handles `/api/*` routes.
- `server/index.js` likely already has the static file serving logic (or needs it added).
- The Pi will run a standard Raspberry Pi OS (Debian-based) with Node.js installed.
- Required env vars: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, plus any added by later specs (`STEAM_API_KEY`, `STEAM_ID`, `ANTHROPIC_API_KEY`, weather lat/lon).
- **Note**: The current Strava client secret was exposed and needs to be regenerated. This spec should document this in the setup instructions but cannot perform the actual rotation (requires Strava web UI).
- systemd is the standard process manager on Raspberry Pi OS.

## Affected files

**New files:**
- `deploy/dashboard.service` — systemd unit file
- `deploy/README.md` — deployment instructions
- `.env.example` — template of all required environment variables

**Modified files:**
- `server/index.js` — ensure it serves `dist/` static files in production mode and has correct CORS/proxy handling
- `package.json` — add a `start` script for production mode if not present

## Implementation

1. **Verify static file serving in Express** — Read `server/index.js` and confirm it serves the `dist/` directory. If not, add:
   ```javascript
   const path = require('path');
   
   // Serve static files from the React build
   app.use(express.static(path.join(__dirname, '..', 'dist')));
   
   // SPA fallback — serve index.html for any non-API route
   app.get('*', (req, res) => {
     if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
     res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
   });
   ```
   The SPA fallback must come AFTER all API routes. This ensures client-side routing works if we add it later.

2. **Add a `start` script to package.json** — If not already present:
   ```json
   "start": "node server/index.js"
   ```
   This is what the systemd service will call.

3. **Create `.env.example`** — A template file listing all environment variables with placeholder values and comments:
   ```
   # Strava OAuth (https://www.strava.com/settings/api)
   STRAVA_CLIENT_ID=
   STRAVA_CLIENT_SECRET=
   STRAVA_REFRESH_TOKEN=

   # Weather (Open-Meteo uses lat/lon, no API key needed)
   WEATHER_LAT=58.97
   WEATHER_LON=5.73

   # Steam (https://steamcommunity.com/dev/apikey)
   STEAM_API_KEY=
   STEAM_ID=

   # AI Workout (Anthropic)
   ANTHROPIC_API_KEY=

   # Server
   PORT=3001
   ```

4. **Create the systemd service file** — `deploy/dashboard.service`:
   ```ini
   [Unit]
   Description=Dashboard v3
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/dashboard_v3
   ExecStart=/usr/bin/node server/index.js
   Restart=on-failure
   RestartSec=5
   Environment=NODE_ENV=production
   EnvironmentFile=/home/pi/dashboard_v3/.env

   [Install]
   WantedBy=multi-user.target
   ```
   Notes:
   - `User=pi` assumes the default Pi user — document that this should be changed if using a different user.
   - `EnvironmentFile` points to the `.env` in the project root.
   - `After=network-online.target` ensures the network is up before starting (needed for Strava/Steam/weather API calls).
   - `Restart=on-failure` with `RestartSec=5` ensures the service recovers from crashes.

5. **Create deployment instructions** — `deploy/README.md`:
   - Prerequisites: Node.js (v20+), npm, git
   - Clone the repo, `npm install`, copy `.env.example` to `.env` and fill in values
   - Build: `npm run build`
   - Test: `npm start` and visit `http://pi-ip:3001`
   - Install systemd service: `sudo cp deploy/dashboard.service /etc/systemd/system/` → `sudo systemctl daemon-reload` → `sudo systemctl enable dashboard` → `sudo systemctl start dashboard`
   - Logs: `journalctl -u dashboard -f`
   - Update workflow: `git pull && npm install && npm run build && sudo systemctl restart dashboard`
   - Note about regenerating the Strava client secret (it was previously exposed — go to https://www.strava.com/settings/api and click "Regenerate" under Client Secret, then update `.env`)

6. **Ensure the production build works** — Verify that `npm run build` completes successfully. The Vite config should already output to `dist/`. Check `vite.config.ts` for any dev-only proxy settings that might need to be absent in production (the proxy is only used by the dev server, not the built files — Express handles API routes directly in production).

## Testing

- **Unit tests** — Run `npm run build` and verify it completes without errors.

- **Integration** —
  1. Run `npm run build`.
  2. Set `NODE_ENV=production` and run `npm start`.
  3. Visit `http://localhost:3001` — verify the dashboard loads from the static build.
  4. Verify API routes still work: `curl http://localhost:3001/api/health`.
  5. Verify SPA fallback: navigating to `http://localhost:3001/nonexistent` should serve `index.html`, not a 404.

- **Validation** —
  - `deploy/dashboard.service` is valid systemd syntax
  - `.env.example` lists all required variables
  - `deploy/README.md` covers the full setup flow

## Acceptance criteria

- [ ] `npm run build` produces a working production build in `dist/`
- [ ] Express serves `dist/` static files and handles SPA fallback
- [ ] `npm start` runs the production server
- [ ] systemd service file is complete with correct paths, user, and restart policy
- [ ] `.env.example` documents all required environment variables
- [ ] `deploy/README.md` covers: prerequisites, setup, build, systemd install, updating, and Strava secret regeneration
- [ ] Production server responds to both API routes and frontend routes
