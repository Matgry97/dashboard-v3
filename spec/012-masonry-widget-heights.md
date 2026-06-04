# Fix widget heights — intrinsic sizing with masonry-like stacking

## Goal

Widgets currently stretch to match the tallest widget in their CSS grid row, creating ugly empty whitespace inside shorter widgets. Change the layout so every widget sizes to its own content height and widgets stack neatly in three columns without affecting each other's height.

## Context

- The dashboard uses `display: grid; grid-template-columns: repeat(3, 1fr)` in `src/components/dashboard/Dashboard.module.css`. CSS grid's default `align-items: stretch` forces every item in an implicit row to match the tallest item's height.
- `WidgetShell` has `min-height: 200px` and its `.body` has `flex: 1`, both of which compound the stretching.
- Several widgets set `height: 100%` on their root container (Clock, Weather, WeatherForecast, LastWorkout, WeeklyPlanner), which makes them fill whatever height the shell gives them rather than sizing to content.
- WeeklyPlanner has a hardcoded `min-height: 420px`.
- The fix is straightforward: add `align-items: start` to the grid so items don't stretch to row height, then remove the height-filling patterns from shells and widgets so they size to their intrinsic content height.
- **Important**: the `.grid` must keep `position: relative; z-index: 0` — this is the stacking context fix from spec 001 that prevents Leaflet map z-indexes from bleeding over modals.
- Drag-and-drop (drag start, drag over, drop) must still work after the layout change.

## Affected files

**Modified files:**
- `src/components/dashboard/Dashboard.module.css` — add `align-items: start` to `.grid`
- `src/components/widget-shell/WidgetShell.module.css` — remove `min-height: 200px` from `.shell`, remove `flex: 1` from `.body`
- `src/widgets/clock/ClockWidget.module.css` — replace `height: 100%` with padding for vertical centering
- `src/widgets/weather/WeatherWidget.module.css` — replace `height: 100%` with padding for vertical centering
- `src/widgets/weather-forecast/WeatherForecast.module.css` — replace `height: 100%` with padding for vertical centering
- `src/widgets/last-workout/LastWorkoutWidget.module.css` — remove `height: 100%` (content already flows top-down)
- `src/widgets/weekly-planner/WeeklyPlannerWidget.module.css` — remove `height: 100%` and `min-height: 420px`

## Implementation

1. **Add `align-items: start` to the grid** — In `src/components/dashboard/Dashboard.module.css`, add `align-items: start;` to the `.grid` rule. This is the core fix: grid items will no longer stretch to match row height. Keep all other properties unchanged (especially `position: relative; z-index: 0`).

   ```css
   .grid {
     position: relative;
     z-index: 0;
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 28px;
     padding: 32px;
     align-content: start;
     align-items: start;    /* ← add this */
   }
   ```

2. **Remove height-forcing from WidgetShell** — In `src/components/widget-shell/WidgetShell.module.css`:
   - Remove `min-height: 200px` from `.shell`. The shell should be as tall as its content needs.
   - Remove `flex: 1` from `.body`. The body should wrap its content, not stretch to fill the shell. Keep the padding and overflow.

   After changes, `.shell` keeps `display: flex; flex-direction: column;` (header stacks on top of body) and `.body` keeps `padding: 12px 16px 16px; overflow: auto;`.

3. **Fix Clock widget** — In `src/widgets/clock/ClockWidget.module.css`, the `.clock` class currently has `height: 100%; justify-content: center;`. Replace `height: 100%` with vertical padding so the content is spaced nicely without depending on the parent's height:

   ```css
   .clock {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     padding: 24px 0;       /* ← replace height: 100% with padding */
     gap: 6px;
   }
   ```

4. **Fix Weather widget** — In `src/widgets/weather/WeatherWidget.module.css`, the `.container` has `height: 100%; justify-content: center;`. Same approach — replace with padding:

   ```css
   .container {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     padding: 20px 0;       /* ← replace height: 100% with padding */
     gap: 4px;
   }
   ```

5. **Fix WeatherForecast widget** — In `src/widgets/weather-forecast/WeatherForecast.module.css`, the `.container` has `height: 100%; justify-content: center;`. Replace with padding:

   ```css
   .container {
     display: flex;
     align-items: center;
     justify-content: center;
     padding: 16px 0;       /* ← replace height: 100% with padding */
     gap: 28px;
   }
   ```

6. **Fix LastWorkout widget** — In `src/widgets/last-workout/LastWorkoutWidget.module.css`, the `.container` has `height: 100%`. Simply remove it — the content already flows top-down with flexbox and doesn't need a forced height:

   ```css
   .container {
     display: flex;
     flex-direction: column;
     gap: 10px;             /* height: 100% removed */
   }
   ```

   Also remove `flex: 1` from `.stats` — it was stretching the stats grid to fill remaining height. Change to just `align-content: start`:

   ```css
   .stats {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 10px 0;
     align-content: start;  /* flex: 1 removed */
   }
   ```

   Also change `.footer` from `margin-top: auto` to `margin-top: 4px` — it was using auto to push to the bottom of a stretched container, but now the container sizes to content so a small fixed margin is cleaner.

7. **Fix WeeklyPlanner widget** — In `src/widgets/weekly-planner/WeeklyPlannerWidget.module.css`, remove both `height: 100%` and `min-height: 420px` from `.container`. The 7 day rows with their padding will give the widget a natural height. Each `.day` row should have a reasonable fixed height instead of `flex: 1`:

   ```css
   .container {
     display: flex;
     flex-direction: column;
     gap: 1px;              /* height: 100% and min-height: 420px removed */
     background: var(--color-border);
     border-radius: 8px;
     overflow: hidden;
   }

   .day {
     display: flex;
     align-items: center;
     padding: 12px 1em;     /* ← explicit vertical padding instead of flex: 1 */
     background: var(--color-surface);
     transition: background 0.15s;
   }
   ```

   Remove `min-height: 0` and `flex: 1` from `.day` — each row sizes to its content + padding.

## Testing

- **E2E / visual** —
  1. Add all available widgets (Clock, Today's Weather, 5-Day Forecast, Last Workout, Run Map, Weekly Planner) to a single tab.
  2. Screenshot the full page.
  3. Verify that widgets have different heights — shorter widgets (Clock, Weather) should NOT have the same height as taller ones (Weekly Planner, Run Map).
  4. Verify no widget has excessive blank space inside it.
  5. Verify widgets still align to the 3-column grid (all left edges in a column should align).
  6. Verify the Run Map still renders correctly with its aspect-ratio container.
  7. Verify the Leaflet map does NOT appear above the add-widget modal (z-index regression from spec 001).

- **Drag-and-drop** —
  1. Drag a widget from one position to another. It should still reorder correctly.
  2. The drag-over highlight border should still appear on the target widget.

- **Edge cases** —
  - Single widget on a tab: should size to its content, not fill the viewport height.
  - Empty tab: the "No widgets yet" message should still be centered.
  - All widgets in one column scenario (if only 1-2 widgets): should stack vertically without huge gaps.

## Acceptance criteria

- [ ] Grid uses `align-items: start` — widgets no longer stretch to match row height
- [ ] WidgetShell has no `min-height` and `.body` has no `flex: 1`
- [ ] Clock and Weather widgets use padding for vertical spacing instead of `height: 100%`
- [ ] WeeklyPlanner has no hardcoded `min-height: 420px`
- [ ] Each widget's height is determined by its own content, not by siblings in the same row
- [ ] No widget has large empty whitespace at the bottom
- [ ] Run Map still renders correctly with aspect-ratio: 1
- [ ] Leaflet z-index is still scoped (spec 001 regression check)
- [ ] Drag-and-drop reordering still works
- [ ] Empty tab state still displays correctly
