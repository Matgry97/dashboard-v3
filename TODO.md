# TODO

## Immediate

- [ ] **Garmin initial sync** — rate limited during setup, retry when limit clears (Pi only):
  ```bash
  garmindb_cli.py --activities --download --import --analyze
  ```
- [ ] **Create `.env`** from `.env.example` and set `GARMINDB_CLI_PATH` for the Pi (Pi only)

## Frontend

- [x] **Resize widget UI** — cycle button (S/M/L) in `WidgetShell` header
- [x] **Widget reorder UI** — HTML5 drag-and-drop on widget shells

## Pi Deployment

- [ ] **systemd service** — set up Express as a systemd service so it starts on boot
- [ ] **Cron job** — schedule `garmindb_cli.py --activities --download --import --analyze --latest` to run hourly so the last-workout widget stays fresh without manual syncing
- [ ] **Set `GARMINDB_CLI_PATH`** in the `.env` on the Pi — the systemd service will have a minimal PATH and won't find `garmindb_cli.py` without the full path

## Maintenance

- [x] **Update `ARCHITECTURE.md`** — weather integration pattern changed (now `server/integrations/weather/` instead of Vite proxy), doc is stale
