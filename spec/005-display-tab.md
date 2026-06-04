# Display tab — glanceable touch-first dashboard view

## Goal

Add a "Display" tab to the dashboard designed for always-on use on a Raspberry Pi touchscreen. Unlike regular tabs which use an editable 3-column grid, the display tab has a fixed curated layout optimized for glancing at a distance — large text, high contrast, minimum 44px tap targets. Users configure which widgets appear via a simple toggle panel. Display config is persisted separately from regular tab widget configs.

## Context

- The architecture doc (`ARCHITECTURE.md`) has a section on the Display Tab with the design goals and implementation plan.
- A placeholder component already exists: `src/components/display/DisplayTab.tsx` (may be empty or stub).
- The layout component `src/components/layout/AppLayout.tsx` renders the header, tab bar, and either `Dashboard` or `DisplayTab` based on the active tab.
- Regular tabs use `DashboardTab` type from `src/types/dashboard.ts`. The display tab needs a different approach — it's not a regular tab in the `tabs[]` array. It's a separate concept: always present, with its own config.
- Widget registry `src/registry/widget-registry.ts` has `getAllWidgets()` to list available widgets.
- CSS custom properties for the dark theme are in `src/index.css`.
- Touch target minimum: 44px (Apple HIG / WCAG standard).

## Affected files

**New files:**
- `src/store/display-store.ts` — Zustand store for display tab config (which widgets are on/off)
- `src/components/display/DisplayTab.module.css` — styles for the display layout
- `src/components/display/DisplayTogglePanel.tsx` — toggle panel to configure visible widgets
- `src/components/display/DisplayTogglePanel.module.css` — toggle panel styles

**Modified files:**
- `src/components/display/DisplayTab.tsx` — implement the full display tab component
- `src/components/layout/AppLayout.tsx` — add Display as a permanent tab, route to `DisplayTab` when active
- `src/components/tab-bar/TabBar.tsx` — render a permanent "Display" tab that cannot be removed
- `src/types/dashboard.ts` — no changes needed if the display tab is handled outside the `tabs[]` array

## Implementation

1. **Create the display store** — `src/store/display-store.ts`:
   ```typescript
   interface DisplayState {
     enabledWidgets: string[]; // widget IDs (e.g. ["clock", "weather", "last-workout"])
     showTogglePanel: boolean;
     toggleWidget: (widgetId: string) => void;
     setShowTogglePanel: (show: boolean) => void;
   }
   ```
   Use Zustand with `persist` middleware. Storage key: `"display-storage"`. Default `enabledWidgets`: `["clock", "weather", "last-workout"]` — a sensible starting set for a glanceable display.

2. **Add the Display tab to the tab bar** — In `TabBar.tsx`, render a permanent "Display" tab before or after the regular tabs. This tab:
   - Is always present — not part of the `tabs[]` array in the dashboard store
   - Cannot be removed — no × delete button
   - Uses a special ID like `"__display__"` to distinguish it from regular tabs
   - Visually distinct: same style as other tabs but perhaps with a subtle icon or different label treatment
   
   In `AppLayout.tsx`, check if `activeTabId === "__display__"`. If yes, render `DisplayTab` instead of `Dashboard`.

3. **Update the dashboard store to handle the display tab ID** — The `setActiveTab` action in `dashboard-store.ts` already accepts any string. The display tab ID `"__display__"` just needs to be a valid value for `activeTabId`. No schema changes needed — just ensure `removeTab` doesn't try to remove it (it won't, since it's not in the `tabs[]` array).

4. **Implement the DisplayTab component** — `src/components/display/DisplayTab.tsx`:
   - Read `enabledWidgets` and `showTogglePanel` from the display store.
   - For each enabled widget ID, look it up in the widget registry and render its component.
   - Layout: NOT the same 3-column grid as regular tabs. Use a responsive layout optimized for readability:
     - Large single-column or 2-column layout depending on viewport
     - Widgets render without `WidgetShell` chrome (no title bar, no remove button, no resize handles)
     - Generous padding and spacing between widgets
     - Background: `var(--color-bg)` (full bleed, no visible grid)
   - A settings gear button in the top-right corner to toggle the `DisplayTogglePanel`.

5. **Style the display layout** — `DisplayTab.module.css`:
   ```css
   .display {
     padding: 32px;
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
     gap: 24px;
     align-content: start;
     min-height: 100%;
   }
   ```
   Each widget card:
   - Background: `var(--color-surface)` with subtle border
   - Large border-radius (12px)
   - Padding: 24px
   - No title bar — the widget content speaks for itself
   - Touch targets: all interactive elements minimum 44px

6. **Implement the toggle panel** — `DisplayTogglePanel.tsx`:
   - Slide-in panel from the right side (or a modal)
   - Lists all available widgets from the registry (`getAllWidgets()`)
   - Each widget has a toggle switch: on = included in display, off = hidden
   - Toggle calls `toggleWidget(widgetId)` on the display store
   - Close button (44px minimum tap target)
   - Style: `var(--color-surface)` background, clean list of toggle rows

7. **Toggle switch styling** — Each toggle row:
   - Widget name on the left
   - Toggle switch on the right (a styled checkbox or custom toggle)
   - Row height: minimum 48px for easy touch targeting
   - Active toggle: `var(--color-accent)` background on the switch
   - Use `var(--font-ui)` for all text, `14px` size

## Testing

- **E2E / visual** —
  1. Click the "Display" tab. Verify the display layout renders with the default enabled widgets (clock, weather, last-workout).
  2. Screenshot the display tab — verify large text, clean layout, no WidgetShell chrome.
  3. Click the settings button. Verify the toggle panel opens.
  4. Toggle a widget off. Verify it disappears from the display.
  5. Toggle it back on. Verify it reappears.
  6. Reload the page. Verify display config persists (same widgets enabled as before reload).
  7. Switch to a regular tab. Verify regular tab still works normally.
  8. Switch back to Display. Verify it remembers its config.
  9. Verify all tap targets are at least 44px (use Playwright to measure bounding boxes).

- **Edge cases** —
  - No widgets enabled: show a helpful empty state ("Enable widgets using the settings button")
  - All widgets enabled: should still render without overflow
  - Display tab on narrow viewport: verify responsive behavior

## Acceptance criteria

- [ ] "Display" tab is always visible in the tab bar, cannot be removed
- [ ] Display tab renders enabled widgets without WidgetShell chrome (no title bar, no remove button)
- [ ] Layout is optimized for glanceability — larger text, generous spacing
- [ ] Toggle panel allows enabling/disabling widgets for the display
- [ ] Display config persists to localStorage separately from regular tab config (key: `"display-storage"`)
- [ ] All interactive elements on the display tab have minimum 44px tap targets
- [ ] Regular tabs still work exactly as before
- [ ] Empty state shown when no widgets are enabled
- [ ] No hover-only interactions on the display tab — everything accessible via tap
