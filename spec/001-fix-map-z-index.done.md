# Fix Leaflet map rendering over the add-widget modal

## Goal

The run-map widget uses Leaflet, which sets z-index values of 400–700 on its internal panes (tile pane, overlay pane, marker pane, etc.). The add-widget modal overlay uses `z-index: 100`. This means the map renders on top of the modal, making it impossible to add widgets when the map is visible. Fix the stacking so the modal always appears above all dashboard content including Leaflet maps.

## Context

- The modal is in `src/components/widget-picker/WidgetPicker.module.css` — the `.overlay` class has `z-index: 100`.
- Leaflet creates its own stacking context with z-index values on `.leaflet-pane` elements (tile: 200, overlay: 400, marker: 600, popup: 700).
- The fix should use CSS stacking contexts rather than a z-index arms race. By creating a stacking context on the widget grid (or on each widget shell), Leaflet's high z-index values become scoped to that context and cannot escape to compete with the modal.
- The modal is rendered as a portal-like fixed overlay outside the grid flow, so it naturally sits above if the stacking context is correct.
- `src/components/widget-shell/WidgetShell.module.css` wraps every widget.
- `src/components/dashboard/Dashboard.module.css` contains the `.grid` class.

## Affected files

**Modified files:**
- `src/components/widget-picker/WidgetPicker.module.css` — raise the overlay z-index to a safe value (1000+)
- `src/components/dashboard/Dashboard.module.css` — create a stacking context on the grid so all widget z-index values (including Leaflet's) are scoped within it

## Implementation

1. **Create a stacking context on the dashboard grid** — In `Dashboard.module.css`, add `position: relative; z-index: 0;` to the `.grid` class. The `z-index: 0` with `position: relative` creates a new stacking context. All children (including Leaflet's z-index 700 panes) are now scoped within this context and cannot escape above it.

2. **Raise the modal overlay z-index** — In `WidgetPicker.module.css`, change the `.overlay` z-index from `100` to `1000`. This is belt-and-suspenders — the stacking context from step 1 is the real fix, but the higher value makes the intent clear and guards against future additions.

3. **Verify the run-map widget still renders correctly** — The map tiles, polyline, and stats overlay must still be visible and correctly layered within the widget. The `.statsCard` in `RunMapWidget.module.css` uses `z-index: 1000` relative to its parent — this is fine because it's scoped within the widget's stacking context.

## Testing

- **E2E / visual** — With a run-map widget on the dashboard:
  1. Take a screenshot of the dashboard showing the map widget rendering normally.
  2. Open the add-widget modal (click the add-widget button).
  3. Take a screenshot with the modal open. Verify the modal overlay and its content are fully visible — no map tiles or polyline bleeding through.
  4. Verify the modal backdrop blur is visible across the entire viewport.
  5. Close the modal and verify the map still renders correctly (tiles load, polyline visible, stats overlay readable).

- **Edge cases** — Test with multiple map widgets on the same tab to ensure they all stay below the modal.

## Acceptance criteria

- [ ] Add-widget modal renders fully above the Leaflet map — no map tiles visible through the modal overlay
- [ ] Modal backdrop covers the entire viewport including the map area
- [ ] Map widget still renders correctly when modal is closed (tiles, polyline, stats)
- [ ] No horizontal scrollbar introduced
- [ ] No other widget z-index behavior broken (stats overlay on map still visible)
