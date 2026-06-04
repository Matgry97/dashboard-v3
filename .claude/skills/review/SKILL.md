---
name: review
description: Review implementation changes against a spec or the current branch diff. Checks code quality, adherence to project patterns, and catches regressions. Use after implementing a spec, before committing, or when asked to review changes.
---

Review the current changes on this branch. Follow these steps in order:

1. **Gather context** — Run `git diff` to see all staged and unstaged changes. If a spec file path is provided, read it to understand the intent.

2. **Pattern adherence** — Check that changes follow established project conventions:
   - Widgets: self-contained folder under `src/widgets/`, registers via `registerWidget()`, imported in `src/widgets/index.ts`
   - Stores: Zustand with `persist` middleware where needed, day-level cache pattern for API data
   - Styling: CSS Modules only, uses CSS custom properties from `index.css`, no inline styles
   - Server integrations: `router.js` + `service.js` under `server/integrations/`, consistent `{ ok, data }` response envelope
   - Types: defined in `src/types/`, no `any`

3. **UI states** — Every widget that fetches data must handle loading, error, and data states.

4. **Regressions** — Look for:
   - z-index conflicts (Leaflet map vs modals)
   - Broken imports or missing barrel exports
   - localStorage key collisions in Zustand stores
   - Hardcoded sizes that should be responsive

5. **Security** — No secrets in code, no raw `innerHTML`, API inputs validated on the server.

6. **Report** — Summarize findings as:
   - **Pass**: Changes look good, note anything particularly well done
   - **Issues**: List each issue with file path, line number, and what to fix
   - **Suggestions**: Optional improvements that aren't blockers
