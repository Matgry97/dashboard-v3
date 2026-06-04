# [Short descriptive title]

## Goal

One to three sentences explaining what this spec achieves and why it matters. Include user-facing impact.

## Context

Relevant background for the implementer:
- Which existing patterns to follow (reference specific files)
- What already exists that this builds on
- Constraints or gotchas to be aware of

## Affected files

List every file that will be created or modified. Use exact paths relative to project root.

**New files:**
- `path/to/new/File.tsx` — what it does
- `path/to/new/File.module.css` — what it styles

**Modified files:**
- `path/to/existing/file.ts` — what changes and why

## Implementation

Numbered steps with enough detail that the implementer can execute each one without guessing. Each step should be a concrete action, not a vague instruction.

1. **Step name** — Detailed description of what to do. Include type signatures, CSS properties, function names, and expected behavior. Reference existing code patterns where relevant (e.g. "follow the pattern in `src/widgets/last-workout/index.ts`").

2. **Step name** — If a step involves UI, describe the visual result: layout, spacing, colors (use CSS custom properties), typography, responsive behavior.

3. **Step name** — If a step involves state, describe the store shape, persistence key, and how the data flows from store to component.

## Testing

What the `/test` skill should verify after implementation:

- **Unit tests** — specific behaviors to test (list test cases)
- **E2E / visual** — what Playwright should check: elements visible, correct layout, no overflow, z-index correct, screenshots to capture
- **Edge cases** — empty state, error state, boundary conditions

## Acceptance criteria

Checklist of what "done" looks like. Every item must be true for the spec to pass.

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
