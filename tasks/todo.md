# Chore: session-resume orientation — `npm run where` + handoff memory

**Branch:** `chore/session-resume` (off `develop`). Additive tooling; merge after approval,
reset this file to the placeholder first.

## Why
On reopening a session, give a clear, repeatable way to figure out where we left off, without
relying on a stale mental model (especially with two contributors moving `develop`).

## Plan
1. `scripts/where.sh` + `npm run where` — read-only orientation snapshot: branch, uncommitted
   changes, recent commits, local branches with work not yet merged to `develop`, `tasks/todo.md`
   state, and whether the dev server is up.
2. A `current-work` auto-memory handoff note (intent + next step) that auto-loads each session;
   kept current, trimmed to "nothing in flight" when a thread closes.
3. Docs: `scripts/README.md` + `CLAUDE.md` → Commands; index the memory in `MEMORY.md`.

## Resume process (the deliverable)
On a new session: read `current-work` (intent) → run `npm run where` (facts) → open with a
short "here's where we are + next step."

## Review
Done. `scripts/where.sh` + `npm run where` verified (prints branch/uncommitted/commits/unmerged/
todo/server). `current-work` + `dev-tooling-scripts` memories written and indexed in `MEMORY.md`.
Documented in `scripts/README.md` and `CLAUDE.md`. Additive only — new script + npm alias + docs;
the memory is local to my auto-memory. `npm run check` left to run on the integrated tree at merge.
