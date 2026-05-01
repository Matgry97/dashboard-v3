# TODO

## Immediate

- [ ] **Garmin initial sync** — rate limited during setup, retry when limit clears:
  ```bash
  garmindb_cli.py --activities --download --import --analyze
  ```
- [ ] **Create `.env`** from `.env.example` and set `GARMINDB_CLI_PATH` for the Pi

## Frontend

- [ ] **Resize widget UI** — `resizeWidget` action exists in the store but there is no button or control in `WidgetShell` to trigger it yet
- [ ] **Widget reorder UI** — `reorderWidgets` exists in the store but drag-and-drop is not implemented

## Pi Deployment

- [ ] **systemd service** — set up Express as a systemd service so it starts on boot
- [ ] **Cron job** — schedule `garmindb_cli.py --activities --download --import --analyze --latest` to run hourly so the last-workout widget stays fresh without manual syncing
- [ ] **Set `GARMINDB_CLI_PATH`** in the `.env` on the Pi — the systemd service will have a minimal PATH and won't find `garmindb_cli.py` without the full path

## Maintenance

- [ ] **Update `ARCHITECTURE.md`** — weather integration pattern changed (now `server/integrations/weather/` instead of Vite proxy), doc is stale
