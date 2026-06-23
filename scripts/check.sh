#!/usr/bin/env bash
# Low-noise variant of `npm test`: run the full gate (lint -> typecheck -> unit ->
# e2e, fail-fast) but stay quiet on success — one `✓ <stage>` line each, and dump
# output only for the stage that fails. Use this when you just want pass/fail plus
# the first failure without scrolling hundreds of lines; `npm test` still shows
# everything. See scripts/README.md.
set -uo pipefail

# Self-contained: Volta's shims aren't on PATH in non-interactive shells.
export PATH="$HOME/.volta/bin:$PATH"

run() {
  local name="$1"
  shift
  local out
  if out="$("$@" 2>&1)"; then
    echo "✓ $name"
  else
    echo "✗ $name — failed:"
    echo "$out"
    exit 1
  fi
}

run "lint" npm run lint
run "typecheck" npm run typecheck
run "unit" npm run test:unit
run "e2e" npm run test:e2e

echo "All green."
