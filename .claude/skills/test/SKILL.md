---
name: test
description: Run the full test suite — unit tests, type checks, and Playwright visual verification that the dashboard actually renders correctly. Catches layout bugs like z-index overlap, broken sizing, and widgets that break the board. Use after implementing changes or when asked to test.
---

Run all tests for this project and report results. Follow these steps:

1. **Unit tests** — Run `npm test` (Vitest). Report pass/fail count and any failures with file paths.

2. **Type check** — Run `npx tsc --noEmit` to catch type errors that tests might miss.

3. **Visual verification with Playwright** — Both the frontend (`npm run dev`) and backend (`npm run server`) must be running on their default ports (5173 and 3001). If they are not running, start them first and wait for them to be ready before running tests.

   Run `npx playwright test`. Then, beyond the existing test suite, open the dashboard in a Playwright browser and perform these checks:

   - **Dashboard loads** — page loads without console errors, the grid renders, at least one widget is visible.
   - **Widget containment** — every widget must fit within its grid cell. No widget should overflow its bounds or have fixed pixel sizes that break the responsive grid. Check that widget bounding boxes stay within their parent column width.
   - **Z-index layering** — open the add-widget modal (WidgetPicker) and verify it renders ABOVE all other content including Leaflet map tiles. The modal overlay must be the topmost visible element. Take a screenshot with the modal open and verify no map tiles bleed through.
   - **No layout blowout** — the 3-column grid must not be pushed wider than the viewport. No horizontal scrollbar should appear on the dashboard.
   - **Screenshot evidence** — take screenshots at key points (dashboard loaded, modal open over map, each widget type) and save to `e2e/screenshots/`. Read the screenshots to verify they look correct — a widget that renders as a blank box or overflows its container is a failure.

4. **Report** — Summarize as:
   - **All green**: State what passed (e.g. "14 unit tests, 3 e2e tests, visual checks clean, types clean")
   - **Visual issues**: For each issue, describe what's wrong, include the screenshot path, and explain what the expected rendering should be. These are blocking — a widget that ruins the rest of the board is not a passing test.
   - **Failures**: For each test failure, include the test name, file path, and the assertion or error message. Do not truncate stack traces.

If a spec file path is provided, focus visual checks on the feature described in that spec. If no e2e tests exist for the feature yet, write them.
