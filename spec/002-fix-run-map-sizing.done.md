# Fix run-map widget dynamic sizing

## Goal

The run-map widget has hardcoded `width: 500px; height: 500px` on both its `.container` and `.placeholder` classes. This breaks the responsive 3-column grid — the widget overflows its column when the viewport is narrow and wastes space when it's wide. The map should fill its grid cell dynamically and maintain a square aspect ratio.

## Context

- The dashboard uses a 3-column CSS grid defined in `src/components/dashboard/Dashboard.module.css` with `grid-template-columns: repeat(3, 1fr)` and `gap: 28px`.
- `WidgetShell` in `src/components/widget-shell/WidgetShell.module.css` wraps each widget and controls how many columns it spans based on the `WidgetSize` (`small` = 1col, `medium` = 2col, `large` = 3col).
- The run-map widget is defined in `src/widgets/run-map/RunMapWidget.tsx` and `src/widgets/run-map/RunMapWidget.module.css`.
- The map's `defaultSize` is registered in `src/widgets/run-map/index.ts` — check what it currently is.
- Leaflet requires a container with explicit dimensions to render. It does not work with `height: auto`. The solution is to use `aspect-ratio: 1` to let the browser calculate height from the column width, then tell Leaflet to `invalidateSize()` if needed.
- Other widgets (clock, weather) already size themselves fluidly within the grid — no fixed pixel values.

## Affected files

**Modified files:**
- `src/widgets/run-map/RunMapWidget.module.css` — remove fixed pixel sizes, use `width: 100%` and `aspect-ratio: 1`
- `src/widgets/run-map/RunMapWidget.tsx` — call `map.invalidateSize()` after the container is laid out, so Leaflet recalculates its viewport based on the new dynamic size

## Implementation

1. **Update `.container` in RunMapWidget.module.css** — Remove `width: 500px; height: 500px`. Replace with:
   ```css
   .container {
     position: relative;
     width: 100%;
     aspect-ratio: 1;
     border-radius: 4px;
     overflow: hidden;
   }
   ```
   The `width: 100%` makes it fill the grid cell. `aspect-ratio: 1` gives it a square shape computed from the available width.

2. **Update `.placeholder` in RunMapWidget.module.css** — Same change: remove `width: 500px; height: 500px`, replace with `width: 100%; aspect-ratio: 1;`.

3. **Call `invalidateSize()` on the Leaflet map** — In `RunMapWidget.tsx`, after the map is created and added to the DOM, Leaflet may have calculated its size from a not-yet-laid-out container. Add a `setTimeout(() => map.invalidateSize(), 0)` after `map.fitBounds(...)` to force Leaflet to recalculate once the browser has computed the aspect-ratio layout. This is a standard Leaflet pattern for dynamically sized containers.

4. **Verify the `.map` class still works** — The `.map` class uses `position: absolute; inset: 0;` which stretches to fill the parent. Since the parent now sizes via `aspect-ratio`, the absolute positioning still works correctly.

5. **Check the asymmetric padding on `fitBounds`** — The existing `paddingTopLeft: [140, 8], paddingBottomRight: [8, 90]` assumes a 500px container. These padding values should be reasonable for any size, but verify the route polyline is still visible and the stats overlay doesn't cover it on smaller column widths.

## Testing

- **E2E / visual** —
  1. Screenshot the dashboard at the default viewport width. The map widget should fill its grid column with no overflow.
  2. Resize the viewport to a narrow width (e.g. 900px). The map should shrink proportionally — no horizontal scrollbar, no overflow past the grid cell boundary.
  3. Resize to a wide viewport (e.g. 1600px). The map should grow to fill the wider column.
  4. Verify the map tiles load correctly and the polyline is visible at all sizes.
  5. Verify the stats overlay (`statsCard`) is positioned correctly at different sizes.
  6. Check that the map's bounding box does not exceed its parent WidgetShell's bounding box.

- **Edge cases** —
  - Map with no run data (placeholder state) should also size correctly.
  - Multiple map widgets on the same tab should each size independently.

## Acceptance criteria

- [ ] No hardcoded pixel dimensions on the map container or placeholder
- [ ] Map fills its grid column width with a 1:1 aspect ratio
- [ ] No horizontal scrollbar at any reasonable viewport width (900px–1920px)
- [ ] Map tiles render correctly — no grey/blank areas from Leaflet size miscalculation
- [ ] Polyline route is visible and not hidden behind the stats overlay
- [ ] Stats overlay is readable and positioned within the map bounds
- [ ] Placeholder state ("No route data" / "Loading route...") sizes correctly
