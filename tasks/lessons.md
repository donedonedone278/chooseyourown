# Lessons

Patterns to repeat / mistakes not to repeat. Review at session start.

## Fix the procedure, don't work around recurring flaws (2026-06-13)

**Correction:** When a step in our own process keeps biting us, update the documented
procedure (`CLAUDE.md` / this file) instead of patching around it case-by-case — otherwise
we hit the same issue every time. Corollary: doc/procedure fixes discovered *while working
on a feature* go on that feature branch, so they travel with the work that surfaced them.

## The main session starts dev:phone, not the implementing subagent (2026-06-13)

**Mistake:** Subagent prompts told Sonnet to run `npm run dev:phone`. A subagent's
background processes are killed when its turn ends, so the preview was dead before the user
could open it — and we kept manually relaunching (a work-around).

**Rule:** Only the **orchestrator (main session)** starts/relaunches `dev:phone`; its
background process survives across turns. Don't instruct implementing subagents to start it.
Baked into `CLAUDE.md` → "Development loop."

## Per-feature workflow: branch → plan → sonnet → approval → merge (2026-06-13)

**Process:** Every enhancement/feature goes: branch off `develop` → write a plan (for a
Sonnet subagent, usually in `tasks/todo.md`) → Sonnet implements test-first until
`npm test` is green → **get the user's approval** → only then merge to `develop` and push.
Commit freely on the feature branch; never merge to `develop` unapproved. Trivial
chores/doc fixes may go straight to `develop`. Full detail in `CLAUDE.md` → "Branches and
workflow."

## Archive completed plans/designs out of the repo (2026-06-13)

**Rule:** When a plan or design doc is complete, move it to `../oldplans/chooseyourown/`
(outside the repo) — stale in-tree plans confuse new agents. Update any references
(CLAUDE.md, README) so they don't dangle. `CLAUDE.md` + the code are the live source of
truth; old docs are history only.

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
