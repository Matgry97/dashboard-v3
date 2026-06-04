# Strava yearly km tracker widget

## Goal

Add a widget that shows two key numbers: total km ran since January 1 of the current year (YTD), and total km ran over the last 365 days (rolling year). These are the two most motivating distance stats for a runner — "how's my year going?" and "what have I done in a full year?" Simple, glanceable, no fluff.

## Context

- The Strava API provides `GET /api/v3/athletes/{id}/stats` which returns pre-aggregated stats including `ytd_run_totals.distance` (in meters) — this gives us YTD directly without having to paginate through activities.
- For the rolling 365-day total, the stats endpoint also has `all_run_totals` but NOT a rolling-year figure. Two options:
  - **Option A**: Use `GET /api/v3/athlete/activities?after={epochOneYearAgo}&per_page=200` and paginate to sum all run distances. This is accurate but requires multiple API calls for active runners.
  - **Option B**: Use the `ytd_run_totals` for YTD and calculate the rolling year by fetching activities from Jan 1 of last year to Dec 31 of last year, then adding YTD. This is simpler but not a true rolling window.
  - **Go with Option A** — paginate activities from exactly 365 days ago to now and sum distances. Cache the result for the day so we only paginate once. The Strava API allows up to 200 per page, so even a very active runner (300+ runs/year) needs only 2 pages.
- The authenticated athlete's ID can be retrieved from `GET /api/v3/athlete`. Cache it — it never changes.
- Existing Strava service is at `server/integrations/strava/service.js` with token refresh already handled.
- Existing store: `src/store/strava-store.ts`.

## Affected files

**New files:**
- `src/widgets/yearly-km/YearlyKmWidget.tsx` — widget component
- `src/widgets/yearly-km/YearlyKmWidget.module.css` — widget styles
- `src/widgets/yearly-km/index.ts` — widget registration

**Modified files:**
- `server/integrations/strava/service.js` — add `getAthleteStats()` and `getRollingYearDistance()` functions
- `server/integrations/strava/router.js` — add `GET /yearly-km` route
- `src/store/strava-store.ts` — add yearly km state and fetch action
- `src/widgets/index.ts` — add barrel import for `./yearly-km`

## Implementation

1. **Add `getAthleteId()` to the Strava service** — Helper that calls `GET /api/v3/athlete` and caches the result in a module-level variable (the athlete ID never changes per token). Returns the numeric athlete ID.

2. **Add `getAthleteStats()` to the Strava service** — Calls `GET /api/v3/athletes/{id}/stats`. Returns the full stats object. We'll use `ytd_run_totals.distance` for the YTD number.

3. **Add `getRollingYearDistance()` to the Strava service** — Paginates through `GET /api/v3/athlete/activities?after={epoch365daysAgo}&per_page=200`. For each page, filter to `type === 'Run'`, sum `distance`. Continue fetching pages until the API returns fewer than 200 results. Return the total distance in meters.

4. **Add the yearly-km route** — In `server/integrations/strava/router.js`:
   ```javascript
   router.get('/yearly-km', asyncHandler(async (req, res) => {
     let ytdDistance, rollingYearDistance;
     try {
       const [stats, rollingYear] = await Promise.all([
         service.getAthleteStats(),
         service.getRollingYearDistance(),
       ]);
       ytdDistance = stats.ytd_run_totals.distance;       // meters
       rollingYearDistance = rollingYear;                  // meters
     } catch (e) {
       return err(res, 502, 'STRAVA_ERROR', e.message);
     }
     ok(res, { ytdKm: ytdDistance / 1000, rollingYearKm: rollingYearDistance / 1000 });
   }));
   ```

5. **Extend the Strava store** — Add to `src/store/strava-store.ts`:
   ```typescript
   yearlyKm: { ytdKm: number; rollingYearKm: number } | null;
   yearlyKmFetchedDate: string | null;
   yearlyKmStatus: "idle" | "loading" | "success" | "error";
   yearlyKmError: string | null;
   fetchYearlyKmIfNeeded: () => void;
   ```
   Same day-level cache pattern. Fetches from `GET /api/strava/yearly-km`. Include in `partialize` for persistence.

6. **Create the widget component** — `src/widgets/yearly-km/YearlyKmWidget.tsx`:
   - Call `fetchYearlyKmIfNeeded()` in `useEffect`.
   - Handle loading, error, and data states.
   - Layout — two big numbers stacked vertically:
     - **YTD section**:
       - Label: "Since Jan 1" in small uppercase text
       - Value: total km, one decimal place (e.g. "487.3"), in large hero text
       - Unit: "km" in smaller text next to the value
     - **Rolling year section**:
       - Label: "Last 365 days" in small uppercase text
       - Value: total km, one decimal place (e.g. "1,204.8"), in large hero text
       - Unit: "km" in smaller text
     - A thin divider line between the two sections.
   - The YTD number should be slightly more prominent (it's the "current goal" number). The rolling year is context.

7. **Style the widget** — `src/widgets/yearly-km/YearlyKmWidget.module.css`:
   - Container: `display: flex; flex-direction: column; justify-content: center; padding: 20px; gap: 16px; height: 100%;`
   - Label: `font-family: var(--font-ui); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-secondary);`
   - Hero value: `font-family: var(--font-data); font-size: 36px; font-weight: 600; color: var(--color-text); letter-spacing: -0.03em; line-height: 1;`
   - Unit: `font-family: var(--font-data); font-size: 16px; color: var(--color-text-secondary); margin-left: 4px;`
   - Divider: `height: 1px; background: var(--color-border); margin: 0;`
   - Rolling year value: same as hero but slightly smaller — `font-size: 28px;` to create visual hierarchy (YTD is the main number, rolling year is secondary).
   - Format numbers with `toLocaleString()` for thousands separator (e.g. "1,204.8").

8. **Register the widget** — `src/widgets/yearly-km/index.ts`:
   ```typescript
   registerWidget({
     id: "yearly-km",
     name: "Yearly Km",
     description: "Total km ran this year and last 365 days",
     defaultSize: "small",
     component: YearlyKmWidget,
   });
   ```

9. **Add barrel import** — `src/widgets/index.ts`: add `import "./yearly-km";`.

## Testing

- **E2E / visual** —
  1. Add the "Yearly Km" widget to a tab.
  2. Screenshot the widget. Verify two numbers are visible: YTD km and rolling year km.
  3. YTD number should be larger than the rolling year number visually (font size hierarchy).
  4. Numbers should have thousands separators for values over 1,000.
  5. Widget fits within 1 grid column.
  6. Labels "Since Jan 1" and "Last 365 days" are readable.

- **Edge cases** —
  - New Strava user with few runs: small numbers should still display correctly
  - Strava API unavailable: error state with retry
  - Jan 1 (YTD is nearly zero): should show "0.0 km", not an error

## Acceptance criteria

- [ ] `GET /api/strava/yearly-km` returns `ytdKm` (from athlete stats) and `rollingYearKm` (paginated from activities)
- [ ] YTD uses the efficient athlete stats endpoint (no pagination needed)
- [ ] Rolling year paginates correctly for runners with 200+ activities
- [ ] Widget shows both numbers with clear labels: "Since Jan 1" and "Last 365 days"
- [ ] YTD is visually prominent, rolling year is secondary
- [ ] Numbers formatted with one decimal and thousands separator
- [ ] Day-level cache — only fetches once per day
- [ ] Widget handles loading, error, and zero-runs states
- [ ] Widget registered and available in add-widget modal
