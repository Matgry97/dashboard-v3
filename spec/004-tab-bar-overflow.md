# Scrollable tab bar with curated default tabs

## Goal

The tab bar currently renders all tabs in a horizontal flex row with no overflow handling. When many tabs exist (Workout, Weather, Gaming, Display, etc.), they overflow past the viewport edge. The tab bar needs horizontal scrolling. Additionally, create curated default tabs so new users see a useful starting layout instead of a single empty "Dashboard" tab.

## Context

- Tab bar is at `src/components/tab-bar/TabBar.tsx` and `src/components/tab-bar/TabBar.module.css`.
- The `.tabBar` class uses `display: flex; gap: 2px; padding: 0 24px; height: 38px;`.
- Tabs are rendered as buttons with class `.tab`, the active one gets `.tabActive`. There's an `.addTab` button at the end and `.removeTab` × buttons on each tab.
- The dashboard store at `src/store/dashboard-store.ts` creates a single "Dashboard" tab by default via `createDefaultTab()`. The store is persisted to localStorage under key `"dashboard-storage"` — the default tabs should only apply when there's no existing saved state (first visit).
- The widget registry at `src/registry/widget-registry.ts` provides `getWidget(id)` to look up widgets by ID. Check `src/widgets/index.ts` for available widget IDs.

## Affected files

**Modified files:**
- `src/components/tab-bar/TabBar.module.css` — add horizontal scroll behavior, hide scrollbar visually
- `src/components/tab-bar/TabBar.tsx` — add scroll-into-view behavior when active tab changes
- `src/store/dashboard-store.ts` — replace the single default tab with curated default tabs that include pre-populated widgets

## Implementation

1. **Make the tab bar horizontally scrollable** — In `TabBar.module.css`, update the `.tabBar` class:
   ```css
   .tabBar {
     display: flex;
     align-items: center;
     gap: 2px;
     padding: 0 24px;
     background: var(--color-surface-alt);
     border-bottom: 1px solid var(--color-border);
     height: 38px;
     flex-shrink: 0;
     overflow-x: auto;
     overflow-y: hidden;
     scrollbar-width: none; /* Firefox */
   }
   
   .tabBar::-webkit-scrollbar {
     display: none; /* Chrome/Safari */
   }
   ```
   The hidden scrollbar keeps the UI clean — users scroll via mouse wheel, trackpad, or touch swipe. The tab bar should never show a vertical scrollbar.

2. **Prevent tab buttons from shrinking** — Add `flex-shrink: 0` to the `.tab` and `.addTab` classes so individual tabs don't compress when space is tight. They should maintain their natural width and scroll instead.

3. **Scroll active tab into view** — In `TabBar.tsx`, when the active tab changes, scroll the active tab button into the visible area. Use a `ref` on the tab bar container and call `activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })` when `activeTabId` changes. Use a `useEffect` that watches `activeTabId`.

4. **Create curated default tabs** — In `dashboard-store.ts`, replace the single `createDefaultTab()` with a function that creates multiple tabs with pre-populated widgets. The default tabs should be:

   - **Dashboard** — general purpose tab with: `clock`, `weather`, `weather-forecast`
   - **Workout** — fitness-focused tab with: `last-workout`, `run-map`
   
   For each tab, create `WidgetInstance` objects with `id: generateId()`, the correct `widgetId`, and `defaultSize` from the widget's definition. Import `getWidget` from the registry to look up default sizes.

   **Important**: These defaults only apply on first visit. The Zustand `persist` middleware loads from localStorage on init — if `"dashboard-storage"` already exists, these defaults are ignored. This is the existing behavior and requires no changes.

5. **Handle the add-tab button positioning** — The `+` add-tab button should stay at the end of the scrollable area (it already is since it's the last flex child). Make sure it's always reachable by scrolling to the end.

## Testing

- **E2E / visual** —
  1. Clear localStorage and reload. Verify the curated default tabs appear: "Dashboard" with clock+weather widgets, "Workout" with last-workout+run-map.
  2. Add tabs until there are 8+ tabs. Verify the tab bar scrolls horizontally — no tabs cut off, no overflow visible.
  3. Click on the last tab (rightmost). Verify it scrolls smoothly into view.
  4. Click on the first tab. Verify it scrolls back.
  5. Screenshot the tab bar with many tabs to verify clean appearance.
  6. Verify no vertical scrollbar appears on the tab bar.

- **Edge cases** —
  - Single tab: no scroll needed, should look normal.
  - Tab with long name: should not wrap to multiple lines, should truncate or just widen.
  - Remove all but one tab: should still work, no scroll artifacts.

## Acceptance criteria

- [ ] Tab bar scrolls horizontally when tabs overflow
- [ ] No visible scrollbar (hidden via CSS)
- [ ] Active tab scrolls into view smoothly when selected
- [ ] Tab buttons don't shrink/compress — they maintain natural width
- [ ] First visit shows curated default tabs: "Dashboard" (clock, weather, weather-forecast) and "Workout" (last-workout, run-map)
- [ ] Existing users with saved localStorage are unaffected — their tabs load as before
- [ ] Add-tab button is always reachable at the end of the scroll area
- [ ] No horizontal scrollbar on the main dashboard content
