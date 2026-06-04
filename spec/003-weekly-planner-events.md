# Add event input and persistence to weekly planner

## Goal

The weekly planner widget currently shows Mon–Sun rows with day names but no ability to add content. Each day should accept text entries (events, notes, tasks) that persist across page reloads via Zustand/localStorage. This turns the planner from a static display into a functional weekly organizer.

## Context

- The weekly planner widget is at `src/widgets/weekly-planner/WeeklyPlannerWidget.tsx` and `src/widgets/weekly-planner/WeeklyPlannerWidget.module.css`.
- It currently renders 7 day rows using `getWeekDates()` to calculate the current week's dates (Mon–Sun). Each row shows only the day name.
- The component has no props usage (ignores `instanceId`) and no state beyond the date calculation.
- Persistence pattern: follow `src/store/strava-store.ts` — Zustand store with `persist` middleware, `partialize` to control what gets saved to localStorage.
- The planner data is per-week. The store should key entries by date string (`YYYY-MM-DD`) so old weeks naturally become irrelevant without manual cleanup.
- The widget registers in `src/widgets/weekly-planner/index.ts` — check its current `defaultSize` (likely `small` = 1 column). It will need to be `medium` (2 columns) or keep as-is depending on how the layout fits.

## Affected files

**New files:**
- `src/store/planner-store.ts` — Zustand store for planner entries

**Modified files:**
- `src/widgets/weekly-planner/WeeklyPlannerWidget.tsx` — add input field per day row, read/write entries from store
- `src/widgets/weekly-planner/WeeklyPlannerWidget.module.css` — style the input area, entry list, and delete button

## Implementation

1. **Create the planner store** — `src/store/planner-store.ts`:
   ```typescript
   interface PlannerEntry {
     id: string;
     text: string;
   }

   interface PlannerState {
     entries: Record<string, PlannerEntry[]>; // keyed by "YYYY-MM-DD"
     addEntry: (date: string, text: string) => void;
     removeEntry: (date: string, entryId: string) => void;
   }
   ```
   Use `zustand` with `persist` middleware. Storage key: `"planner-storage"`. Use `generateId()` from `src/utils/id.ts` for entry IDs. The `addEntry` action should prepend the new entry (newest first) or append (chronological) — append is simpler and more intuitive.

2. **Update the day row layout** — Each day row in the planner should have:
   - Left side: day name (already exists) and the date number (e.g. "4") for context
   - Right/below: list of entries for that day + an inline text input to add a new entry
   - Layout the day row as a vertical flex: day header line, then entries, then input. Keep it compact — each entry is one line of text.

3. **Add the entry list per day** — For each day, read `entries[dateStr]` from the planner store. Render each entry as a single line with the text and a small delete button (×) on hover. Style entries with `font-family: var(--font-ui)`, `font-size: 12px`, `color: var(--color-text)`.

4. **Add the inline input** — At the bottom of each day's entries, render a text input. Behavior:
   - Placeholder: "Add note..." in `var(--color-text-secondary)` at a dimmed opacity
   - On Enter key: call `addEntry(dateStr, inputValue)`, clear the input
   - On Escape key: clear the input and blur
   - Style: no visible border in default state, subtle bottom border or background on focus. Use `var(--color-surface-alt)` background. Keep it minimal — the input should feel like part of the row, not a separate form element.
   - The input should be `font-size: 12px` to match entry text.

5. **Add delete functionality** — Each entry shows a small × button. It should be barely visible (opacity 0.3) and become fully visible on hover (opacity 1, `color: var(--color-danger)`). On click, call `removeEntry(dateStr, entryId)`.

6. **Add the date number to the day header** — Show the day-of-month number next to the day name, e.g. "Monday" and "4" in a lighter color. This helps when looking at the planner to know which date each row corresponds to.

7. **Handle week transitions** — `getWeekDates()` already calculates the correct Mon–Sun dates for the current week. The store keys entries by `YYYY-MM-DD`, so when the week rolls over, the new week's dates will naturally look up empty entries while old entries remain in localStorage (harmless, could be cleaned up later).

## Testing

- **Unit tests** — Test the planner store:
  - `addEntry` creates an entry under the correct date key
  - `removeEntry` removes only the specified entry
  - Entries for different dates don't interfere
  - Store persists to localStorage under key `"planner-storage"`

- **E2E / visual** —
  1. Screenshot the planner widget showing the day rows.
  2. Click into Monday's input, type "Morning run", press Enter. The entry should appear in Monday's list.
  3. Add a second entry to Monday. Both should be visible.
  4. Hover over an entry — the delete button should become visible.
  5. Reload the page — entries should persist.
  6. Screenshot the planner with several entries across different days to verify layout doesn't break.

- **Edge cases** —
  - Empty input: pressing Enter with no text should do nothing.
  - Long text: a very long entry should truncate with ellipsis or wrap gracefully, not blow out the row width.
  - All 7 days with multiple entries: the widget should scroll or flex without breaking.

## Acceptance criteria

- [ ] Each day row has a text input for adding entries
- [ ] Pressing Enter adds the entry to that day's list
- [ ] Entries display below the day name as a compact list
- [ ] Each entry has a delete button that removes it
- [ ] Entries persist across page reloads (Zustand + localStorage)
- [ ] Entries are keyed by date string — correct entries show for the current week
- [ ] Date number is visible next to the day name
- [ ] Empty input submission is ignored
- [ ] Long text entries don't break the layout
- [ ] Widget fits within its grid cell with no overflow
