#!/usr/bin/env bash
# Spec-driven development runner.
#
# Usage:
#   ./spec/runner/run.sh                          run all pending specs
#   ./spec/runner/run.sh spec/001-foo.md           run a single spec
#   SPEC_TERMINAL=inline ./spec/runner/run.sh      run inline (no terminal window)
#   SPEC_TERMINAL=auto   ./spec/runner/run.sh      auto-detect terminal emulator
#
# Spec files: spec/[0-9]*.md (e.g. 001-feature.md)
# Completed:  spec/[0-9]*.done.md  (renamed automatically on success)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SPEC_DIR/.." && pwd)"
WORK_DIR="$(mktemp -d /tmp/spec-runner.XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

# ── output helpers ────────────────────────────────────────────────────────────

hr()  { printf '%.0s─' $(seq 1 55); printf '\n'; }
ok()  { printf '  ✓  %s\n' "$*"; }
bad() { printf '  ✗  %s\n' "$*"; }

# ── prompt builder ────────────────────────────────────────────────────────────

write_prompt() {
    local spec="$1" dest="$2"
    cat > "$dest" <<PROMPT
You are executing a spec-driven development task. Your job is to implement, review, and test what is described in this spec.

Spec file: $spec

## Phase 1: Implement
1. Read the spec file completely before starting.
2. Implement everything described — no partial work, no stubs, no placeholders.
3. Do not ask for clarification; use your best judgement.

## Phase 2: Self-review
4. Run /review against your changes. Check that code follows project patterns (widget registration, CSS Modules, Zustand stores, server integration structure). Fix any issues found before proceeding.

## Phase 3: Self-test
5. Run /test to verify your changes. This runs unit tests, type checks, and Playwright visual verification. The dashboard must render correctly — no z-index overlap, no widgets overflowing their grid cells, no layout blowout. If tests or visual checks fail, fix the issues and re-test until green.

## Completion
6. Only after implementation is complete, review passes, and tests are green, output exactly this on its own line as your very last output:

SPEC DONE

Do not output "SPEC DONE" until all three phases pass.
PROMPT
}

# ── inline mode ───────────────────────────────────────────────────────────────

run_inline() {
    local spec="$1"
    local name; name="$(basename "$spec" .md)"
    local prompt_file="$WORK_DIR/$name.prompt"

    write_prompt "$spec" "$prompt_file"

    hr; printf '  ▶  %s\n' "$name"; hr

    local found=false ec=0
    while IFS= read -r line; do
        printf '%s\n' "$line"
        [[ "$line" == *"SPEC DONE"* ]] && found=true
    done < <(cd "$PROJECT_ROOT" && claude -p "$(cat "$prompt_file")" --model claude-sonnet-4-6 --dangerously-skip-permissions 2>&1) || ec=$?

    echo ""
    if $found; then
        mv "$spec" "${spec%.md}.done.md"
        ok "$name"; return 0
    else
        bad "$name — 'SPEC DONE' not found (exit $ec)"; return 1
    fi
}

# ── terminal mode ─────────────────────────────────────────────────────────────

detect_term() {
    for t in kitty alacritty foot wezterm gnome-terminal konsole xterm; do
        command -v "$t" &>/dev/null && echo "$t" && return
    done
    echo ""
}

spawn_term() {
    local title="$1" inner="$2" term="$3"
    case "$term" in
        kitty)           kitty --title "$title" -- bash "$inner" & ;;
        alacritty)       alacritty --title "$title" -e bash "$inner" & ;;
        foot)            foot --title "$title" -- bash "$inner" & ;;
        wezterm)         wezterm start --title "$title" -- bash "$inner" & ;;
        gnome-terminal)  gnome-terminal --title "$title" -- bash "$inner" & ;;
        konsole)         konsole -p tabtitle="$title" -e bash "$inner" & ;;
        xterm)           xterm -title "$title" -e bash "$inner" & ;;
    esac
}

run_terminal() {
    local spec="$1" term="$2"
    local name; name="$(basename "$spec" .md)"
    local prompt_file="$WORK_DIR/$name.prompt"
    local log_file="$WORK_DIR/$name.log"
    local done_flag="$WORK_DIR/$name.done"
    local inner="$WORK_DIR/$name.sh"

    write_prompt "$spec" "$prompt_file"

    # Write the script that runs inside the terminal window
    cat > "$inner" <<INNER
#!/usr/bin/env bash
cd $(printf '%q' "$PROJECT_ROOT")
claude -p "\$(cat $(printf '%q' "$prompt_file"))" --model claude-sonnet-4-6 --dangerously-skip-permissions 2>&1 | tee $(printf '%q' "$log_file")
touch $(printf '%q' "$done_flag")
INNER
    chmod +x "$inner"

    hr; printf '  ▶  %s  [%s]\n' "$name" "$term"; hr
    spawn_term "Spec: $name" "$inner" "$term"

    # Monitor for completion
    local elapsed=0
    while true; do
        sleep 1; (( elapsed++ )) || true
        (( elapsed % 30 == 0 )) && printf '  ... %ds\n' "$elapsed"

        if grep -q "SPEC DONE" "$log_file" 2>/dev/null; then
            ok "$name  (${elapsed}s)"; mv "$spec" "${spec%.md}.done.md"; return 0
        fi

        if [[ -f "$done_flag" ]]; then
            # Process exited — one final check
            if grep -q "SPEC DONE" "$log_file" 2>/dev/null; then
                ok "$name  (${elapsed}s)"; mv "$spec" "${spec%.md}.done.md"; return 0
            fi
            bad "$name — process exited without 'SPEC DONE'"; return 1
        fi
    done
}

# ── dispatch ──────────────────────────────────────────────────────────────────

run_spec() {
    local spec="$1"
    local term="${SPEC_TERMINAL:-alacritty}"
    [[ "$term" == "auto" ]] && term="$(detect_term)"

    if [[ "$term" == "inline" || -z "$term" ]]; then
        run_inline "$spec"
    else
        run_terminal "$spec" "$term"
    fi
}

# ── main ──────────────────────────────────────────────────────────────────────

if [[ $# -gt 0 ]]; then
    run_spec "$1"
    exit $?
fi

mapfile -t specs < <(find "$SPEC_DIR" -maxdepth 1 -name "[0-9]*.md" ! -name "*.done.md" | sort)

if [[ ${#specs[@]} -eq 0 ]]; then
    echo "No pending specs in $SPEC_DIR/  (pattern: [0-9]*.md)"
    exit 0
fi

echo "Spec runner — ${#specs[@]} pending"

for spec in "${specs[@]}"; do
    echo ""
    if ! run_spec "$spec"; then
        echo ""; bad "Pipeline halted."; exit 1
    fi
done

echo ""; hr; ok "All ${#specs[@]} specs complete."; hr
