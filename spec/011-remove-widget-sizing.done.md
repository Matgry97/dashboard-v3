# Remove widget size picker — all widgets use fixed small size

## Goal

The S/M/L size picker on each widget adds complexity without value. Every widget should be a single column (small) and designed to look good at that size. Remove the size picker UI, remove the resize logic from the store, and hardcode all widgets to `grid-column: span 1`. This simplifies the codebase and forces each widget to be self-contained at one consistent size.

## Context

- `WidgetShell` at `src/components/widget-shell/WidgetShell.tsx` renders a size picker pill with S/M/L buttons. The active size applies CSS classes `.small`, `.medium`, or `.large` from `WidgetShell.module.css` which set `grid-column: span 1/2/3`.
- `src/types/widget.ts` defines `WidgetSize = "small" | "medium" | "large"` and `WidgetDefinition` has `defaultSize` and optional `fixedSize`.
- `src/types/dashboard.ts` defines `WidgetInstance` with a `size: WidgetSize` field.
- `src/store/dashboard-store.ts` has a `resizeWidget()` action.
- The dashboard grid in `src/components/dashboard/Dashboard.module.css` uses `grid-template-columns: repeat(3, 1fr)` — each widget at span 1 means 3 widgets per row.
- All current widgets and their sizes that should be used:
  - `clock` — small (1 col)
  - `weather` — small (1 col)
  - `weather-forecast` — small (1 col)
  - `last-workout` — small (1 col)
  - `run-map` — small (1 col)
  - `weekly-planner` — small (1 col)

## Affected files

**Modified files:**
- `src/components/widget-shell/WidgetShell.tsx` — remove the size picker buttons and size-based CSS class logic; always apply the small (span 1) class
- `src/components/widget-shell/WidgetShell.module.css` — remove `.medium` and `.large` classes, remove `.sizePill`, `.sizeOption`, `.sizeActive` classes; keep `.small` (or just put `grid-column: span 1` on `.shell` directly)
- `src/types/widget.ts` — remove `WidgetSize` type, remove `defaultSize` and `fixedSize` from `WidgetDefinition`
- `src/types/dashboard.ts` — remove `size` from `WidgetInstance`, remove `WidgetSize` import
- `src/store/dashboard-store.ts` — remove `resizeWidget` action, remove `WidgetSize` import, remove `size` from widget instance creation in `addWidget`
- `src/widgets/run-map/index.ts` — remove `defaultSize` from registration
- `src/widgets/clock/index.ts` — remove `defaultSize` from registration
- `src/widgets/weather/index.ts` — remove `defaultSize` from registration
- `src/widgets/weather-forecast/index.ts` — remove `defaultSize` from registration
- `src/widgets/last-workout/index.ts` — remove `defaultSize` from registration
- `src/widgets/weekly-planner/index.ts` — remove `defaultSize` from registration

## Implementation

1. **Remove `WidgetSize` type** — In `src/types/widget.ts`, delete the `WidgetSize` type. Remove `defaultSize` and `fixedSize` from the `WidgetDefinition` interface.

2. **Remove `size` from `WidgetInstance`** — In `src/types/dashboard.ts`, remove the `size: WidgetSize` field and the `WidgetSize` import.

3. **Simplify the dashboard store** — In `src/store/dashboard-store.ts`:
   - Remove the `resizeWidget` action entirely (from both the interface and the implementation).
   - Remove the `WidgetSize` import.
   - In `addWidget`, remove the `size: definition.defaultSize` line from the `WidgetInstance` creation.

4. **Simplify WidgetShell** — In `src/components/widget-shell/WidgetShell.tsx`:
   - Remove the size picker pill UI (the S/M/L buttons).
   - Remove the `size` prop handling and the dynamic className that switches between `.small`/`.medium`/`.large`.
   - Always apply a single shell class — no size variants.
   - Keep the title bar and remove button.

5. **Simplify WidgetShell CSS** — In `src/components/widget-shell/WidgetShell.module.css`:
   - Add `grid-column: span 1;` directly to the `.shell` class.
   - Delete `.small`, `.medium`, `.large` classes.
   - Delete `.sizePill`, `.sizeOption`, `.sizeActive` classes and their hover states.
   - Delete `.compact` class.

6. **Clean up all widget registrations** — In every `index.ts` under `src/widgets/*/`, remove the `defaultSize` property (and `fixedSize` if present) from the `registerWidget()` call.

7. **Handle existing localStorage data** — Users may have `WidgetInstance` objects in localStorage with a `size` field. Since we're removing the field, the persisted data will have an extra property that TypeScript doesn't know about — this is harmless. Zustand's `persist` will just ignore the extra field on read and won't include it on the next write. No migration needed.

## Testing

- **Type check** — `npx tsc --noEmit` must pass with no errors about missing `WidgetSize`, `defaultSize`, `size`, or `resizeWidget`.

- **E2E / visual** —
  1. Load the dashboard. Verify no S/M/L size picker appears on any widget.
  2. All widgets render at 1-column width.
  3. Add a widget via the picker. Verify it appears at 1-column width with no size selector.
  4. Screenshot the dashboard with multiple widgets — verify clean 3-column grid, all consistent size.

- **Edge cases** —
  - Existing localStorage with `size: "large"` on a widget — should still load fine, just renders as 1-column.

## Acceptance criteria

- [ ] No `WidgetSize` type anywhere in the codebase
- [ ] No size picker UI (S/M/L buttons) on any widget
- [ ] No `resizeWidget` action in the store
- [ ] All widgets render at `grid-column: span 1`
- [ ] `WidgetDefinition` no longer has `defaultSize` or `fixedSize`
- [ ] `WidgetInstance` no longer has `size`
- [ ] TypeScript compiles cleanly
- [ ] Existing persisted data still loads without errors
