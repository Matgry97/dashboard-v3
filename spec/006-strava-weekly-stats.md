# Strava weekly stats widget

## Goal

Add a widget that shows aggregated running stats for the current week — total distance, total time, number of runs, and average pace. This reuses the existing Strava OAuth token and follows the same server integration pattern. Gives the user a quick weekly progress overview alongside the existing last-run widget.

## Context

- The existing Strava integration is at `server/integrations/strava/service.js` and `server/integrations/strava/router.js`. The service handles OAuth token refresh automatically.
- The Strava API endpoint `GET /api/v3/athlete/activities` accepts `after` and `before` params (epoch timestamps) to filter by date range. The existing `getLastRun()` in `service.js` already calls this endpoint — the weekly stats endpoint reuses the same auth/token pattern.
- The architecture doc specifies the endpoint should be `GET /api/strava/weekly`.
- Frontend store: `src/store/strava-store.ts` currently handles only the last-run data. The weekly stats can be added to the same store or a new one. Same store is simpler since it shares the same API auth state, but a separate store keeps concerns clean. Use the same store with additional fields.
- Widget pattern: self-contained folder under `src/widgets/`, registers via `registerWidget()`, imported in `src/widgets/index.ts`.
- Response envelope: `{ ok: true, data: { ... } }` per `server/lib/response.js`.

## Affected files

**New files:**
- `src/widgets/strava-weekly/StravaWeeklyWidget.tsx` — widget component
- `src/widgets/strava-weekly/StravaWeeklyWidget.module.css` — widget styles
- `src/widgets/strava-weekly/index.ts` — widget registration

**Modified files:**
- `server/integrations/strava/service.js` — add `getWeeklyStats()` function
- `server/integrations/strava/router.js` — add `GET /weekly` route
- `src/store/strava-store.ts` — add weekly stats state, fetch action, and day-level cache
- `src/widgets/index.ts` — add import for `./strava-weekly`

## Implementation

1. **Add `getWeeklyStats()` to the Strava service** — In `server/integrations/strava/service.js`, add a function that:
   - Calculates the epoch timestamp for Monday 00:00 of the current week and Sunday 23:59
   - Calls the Strava API: `GET /api/v3/athlete/activities?after={mondayEpoch}&before={sundayEpoch}&per_page=50`
   - Filters results to only `type === 'Run'`
   - Aggregates: total distance (meters), total moving time (seconds), count of runs
   - Returns: `{ totalDistance, totalTime, runCount, averagePace }` where `averagePace` is total seconds / total km

2. **Add the weekly route** — In `server/integrations/strava/router.js`, add:
   ```javascript
   router.get('/weekly', asyncHandler(async (req, res) => {
     let stats;
     try {
       stats = await service.getWeeklyStats();
     } catch (e) {
       return err(res, 502, 'STRAVA_ERROR', e.message);
     }
     ok(res, stats);
   }));
   ```

3. **Extend the Strava store** — In `src/store/strava-store.ts`, add:
   ```typescript
   weeklyStats: { totalDistance: number; totalTime: number; runCount: number; averagePace: number } | null;
   weeklyFetchedDate: string | null;
   weeklyStatus: "idle" | "loading" | "success" | "error";
   weeklyError: string | null;
   fetchWeeklyIfNeeded: () => void;
   ```
   Follow the same day-level cache pattern as `fetchIfNeeded` — check `weeklyFetchedDate === today` before fetching. Include `weeklyStats`, `weeklyFetchedDate`, and `weeklyStatus` in the `partialize` function for persistence.

4. **Create the widget component** — `src/widgets/strava-weekly/StravaWeeklyWidget.tsx`:
   - Call `fetchWeeklyIfNeeded()` in a `useEffect`.
   - Handle loading, error, and data states (per project convention).
   - Layout: a compact card showing:
     - Header: "This Week" label
     - Hero stat: total distance in km (large text, e.g. "32.5 km")
     - Secondary stats row: total time (formatted as h:mm), number of runs, average pace (min/km)
   - Style matches the existing last-workout widget aesthetic: `var(--font-data)` for numbers, `var(--font-ui)` for labels, same color scheme.

5. **Style the widget** — `src/widgets/strava-weekly/StravaWeeklyWidget.module.css`:
   - Container: `display: flex; flex-direction: column; padding: 20px; gap: 16px;`
   - Hero value: `font-size: 32px; font-weight: 600; color: var(--color-text);`
   - Secondary stats: horizontal flex with gaps, each stat as a column of value + label
   - Labels: `font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-secondary);`
   - Follow the exact patterns from `LastWorkoutWidget.module.css`.

6. **Register the widget** — `src/widgets/strava-weekly/index.ts`:
   ```typescript
   import { registerWidget } from "../../registry/widget-registry";
   import { StravaWeeklyWidget } from "./StravaWeeklyWidget";

   registerWidget({
     id: "strava-weekly",
     name: "Weekly Stats",
     description: "Running stats for this week",
     defaultSize: "small",
     component: StravaWeeklyWidget,
   });
   ```

7. **Add barrel import** — In `src/widgets/index.ts`, add `import "./strava-weekly";`.

## Testing

- **Unit tests** — Test the weekly stats aggregation logic:
  - Multiple runs in a week aggregate correctly
  - Zero runs returns zeroed stats, not an error
  - Non-run activities (cycling, swimming) are excluded

- **E2E / visual** —
  1. Add the "Weekly Stats" widget to a tab via the add-widget modal.
  2. Screenshot the widget rendering with data. Verify total km, time, runs, and pace are visible and correctly formatted.
  3. Verify the widget fits within its grid cell (small = 1 column).
  4. Verify loading and error states display correctly.

- **Edge cases** —
  - No runs this week: widget should show "0 km", "0 runs", not an error
  - Strava API unreachable: show error state with retry button

## Acceptance criteria

- [ ] `GET /api/strava/weekly` returns aggregated stats for the current week's runs
- [ ] Non-run activities are excluded from the aggregation
- [ ] Widget displays total distance, total time, run count, and average pace
- [ ] Data is cached per-day in the Strava store (same pattern as last-run)
- [ ] Widget handles loading, error, and empty (zero runs) states
- [ ] Widget registered in the registry and available in the add-widget modal
- [ ] Visual style matches the existing last-workout widget aesthetic
- [ ] Widget fits within a single grid column without overflow
