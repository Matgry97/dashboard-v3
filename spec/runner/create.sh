#!/usr/bin/env bash
# Creates a new spec file using Claude Opus 4.6.
# Usage: ./spec/create.sh "description of feature to implement"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SPEC_DIR/.." && pwd)"

if [[ $# -eq 0 ]]; then
    echo "Usage: ./spec/create.sh \"description of feature to implement\""
    exit 1
fi

description="$*"

# Auto-number based on highest existing spec number
next_num() {
    local last
    last=$(find "$SPEC_DIR" -maxdepth 1 -name "[0-9]*.md" \
        | sed 's|.*/\([0-9]*\)[^/]*|\1|' | sort -n | tail -1)
    printf '%03d' $(( ${last:-0} + 1 ))
}

slug=$(printf '%s' "$description" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -cs 'a-z0-9' '-' \
    | sed 's/^-//;s/-$//' \
    | cut -c1-50)

num=$(next_num)
outfile="$SPEC_DIR/${num}-${slug}.md"

prompt="You are a technical spec writer. Write an implementation spec for the feature below.

Project root: $PROJECT_ROOT
Feature request: $description

This spec will be handed to a Claude Sonnet session that will implement it autonomously. Write it so Sonnet can do the full implementation without asking any questions.

Output ONLY the markdown spec — no preamble, no commentary, no code fences wrapping the whole thing.

Structure:
# <short title>

## Goal
One or two sentences on what this achieves.

## Affected files
Bullet list of files to create or modify (use exact paths relative to project root).

## Implementation
Numbered steps with enough detail that Sonnet can execute each one without guessing. Reference existing patterns in the codebase where relevant.

## Acceptance criteria
Short checklist of what done looks like."

echo "  Writing spec with Opus 4.6..."
echo "  Output: $outfile"
echo ""

cd "$PROJECT_ROOT"
claude -p "$prompt" --model claude-opus-4-6 --dangerously-skip-permissions > "$outfile"

echo ""
echo "  ✓ Created: $outfile"
