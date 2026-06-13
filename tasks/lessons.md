# Lessons

Patterns to repeat / mistakes not to repeat. Review at session start.

## Close the loop to the user's phone — without being reminded (2026-06-13)

**Correction:** The user shouldn't have to ask me to make a feature pokeable from their
phone. After building + testing a user-facing feature (`npm test` green), I run
`npm run dev:phone` in the background and hand them the LAN URL + a one-line "what to try."

**Rule:** This is step N+1 of every feature, baked into `CLAUDE.md` → "Development loop."
Reuse the already-running server instead of stacking duplicates.

## `Date.now()` is not a unique key under parallel Playwright (2026-06-13)

**Mistake:** Two e2e specs both used `riley-${Date.now()}@example.com`. Playwright runs
spec files in parallel workers, so they collided on the same millisecond → the second
sign-up hit the unique-email constraint and failed intermittently in `npm test`.

**Rule:** For shared-db e2e fixtures, append randomness:
``const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;``. A flake that
passes when run alone but fails in the full suite is almost always cross-worker state.

## Regular multi-step commands become scripts, not doc snippets (2026-06-13)

**Correction:** Don't leave `&&`-chained or flag-laden commands we run regularly sitting
only in the docs. Put them in `scripts/` with an npm alias (e.g. `dev:phone`, like the
existing `npm test`). Docs reference the script; the script is the source of truth.
