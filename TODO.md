# TODO

## Strava Integration
- [x] **Build Strava server integration** — `server/integrations/strava/` with last-workout endpoint
- [x] **Build last-workout widget** — replace Garmin widget with Strava data

## Display Tab
- [ ] **Add display tab** — separate tab in the existing dashboard, not a new route
- [ ] **Fixed curated layout** — read-only, touch-optimized, full-screen glanceable view
- [ ] **Toggle panel** — simple on/off switches to configure which widgets appear (persisted separately from regular tabs)
- [ ] **Touch-first UI** — minimum 44px tap targets, no hover-only interactions on display tab
- [ ] **Persist display config** — saved in Zustand store separately from regular tab widget configs

## Future Integrations
- [ ] **Strava weekly stats widget** — total km/time this week (reuses existing Strava token)
- [ ] **Last played game widget** — Steam or Xbox API, same server integration pattern
- [ ] **Last earned achievement widget** — Steam or Xbox API
- [ ] **AI workout suggestion widget** — tap to generate, Claude API with Strava history + weather forecast as context

## Pi Deployment
- [ ] **systemd service** — set up Express as a systemd service so it starts on boot
- [ ] **Production build** — `npm run build`, serve `dist/` from Express in production mode
- [ ] **Repeat Strava setup on the Pi** — add `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` to `.env`
- [ ] **Regenerate Strava client secret** — current one was exposed in chat
