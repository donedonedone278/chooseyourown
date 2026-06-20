# Lessons

Patterns to repeat / mistakes not to repeat. Review at session start. **Append new lessons
at the bottom** (newest last) — two contributors editing the same region collide; appending
keeps merges trivial.

## Reset tasks/todo.md to the placeholder before merging (2026-06-13, revised 2026-06-16)

**Correction:** Finished plan + Review notes lingered in `tasks/todo.md` into the next cycle
and confused the picture. Reset `tasks/todo.md` to the empty working-slot placeholder. It
holds only the *current* feature's plan; the durable record lives in `tasks/lessons.md` (and
merged code/commits). **Revised for two contributors:** reset *on the feature branch as the
last commit before merging*, not after — so the plan never reaches `develop` at all,
`develop`'s `tasks/todo.md` stays the placeholder permanently, and two concurrent merges
never conflict on it. See `CLAUDE.md` → "Branches and workflow," step 5.

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

## Two contributors: sync before branch/merge; plan stays on the branch (2026-06-16)

**Process change:** A second contributor joined, so `develop` now moves under us. Earlier
workflow docs silently assumed local `develop` always equalled `origin/develop` and that one
feature was ever in flight. Both assumptions broke. Standing rules now:
- **Re-sync before branching and before merging** — `git checkout develop && git pull
  --ff-only`. A rejected push means someone merged in between; pull and re-push, never force.
- **Plan lives only on the feature branch** — reset `tasks/todo.md` to the placeholder *before*
  merging (see revised entry above), so `develop` never carries a plan and concurrent merges
  don't fight over the file.
- **Branch names carry initials** (`feat/<initials>-<name>`) so two people don't collide.
- **You approve and merge your own work** (local merge, no PR/cross-review gate); `develop →
  main` releases stay a single coordinated step. Full detail in `CLAUDE.md` → "Branches and
  workflow."

## Never use git worktrees for implementation (2026-06-16)

**Correction:** Launched the tagging-system implementation as a subagent with
`isolation: worktree`. The user stopped it: we don't work in worktrees here. A worktree is a
separate checkout that lacks `node_modules` (so `npm test` can't run without a fresh install),
puts the agent on a throwaway branch, and forks the working tree away from the branch we
actually want to build on — confusing for no benefit at our scale.

**Rule:** Implement on the **normal feature branch in the main working tree**. The
orchestrator checks out the feature branch, then launches the (non-isolated) Sonnet subagent,
which shares that working tree. Never pass `isolation: worktree`. Baked into `CLAUDE.md` →
"Branches and workflow," step 3.

## Diagnose caching/feed bugs empirically before theorizing (2026-06-18)

**Self-caught (no user correction needed, but cost a detour):** Given "new chapters
don't show in the feed," I jumped to "client Router Cache is stale" and wrote a heavy
client-nav e2e to "catch" it. The test passed *without* the fix (dev refetches dynamic
routes on client nav), proving it caught nothing — and the rewrite's extra route
compilation starved the dev server enough to make the unrelated `editor.spec` selection
flake on every full-suite run. Two lessons:
- **Diagnose first:** compare the *live server's* output to the DB before guessing.
  `curl localhost:3000/ | grep cardTitle` vs the newest `db.chapter` rows showed the
  feed rendered fresh server-side — so the query/render were fine and the cache was the
  only suspect. That empirical check should come before writing any test or fix.
- **Heavy e2e specs cause contention flakes here.** On WSL2 with 8 Playwright workers
  against `next dev` (on-demand route compilation), adding navigations to one spec can
  push a timing-sensitive spec elsewhere (contentEditable selection in `editor.spec`)
  over the edge. Keep e2e specs lean; prefer `page.goto` over multi-step client nav
  unless the client-nav path is itself what's under test. `revalidatePath` after a
  mutation is the right post-mutation fix regardless — it just isn't deterministically
  e2e-testable under `next dev`.

## Gate the push on a GREEN gate — chain with `&&`, never `;` (2026-06-19)

**Self-caught mistake:** ran `npm run check; ... git push` in one command. The gate
(`check`) came back **red** (the flaky `editor.spec` again), but because the steps were
joined with `;`, the `git push` ran anyway — I shipped to `develop` through a red gate.
A re-run was green (the failure was the known flake, so no broken code actually landed),
but the push should never have fired.
- **Rule:** any "gate then publish" sequence (push, merge, deploy) must be `&&`-chained so
  a non-zero gate aborts the publish — `A && B`, never `A; B`. Better still, run the gate
  as its own step, read the result, *then* push as a separate command.
- **Deeper fix:** a gate that *intermittently* goes red is what makes this dangerous —
  hardened the `editor.spec` selection race (wait for the toolbar `aria-pressed` to reflect
  the selection before toggling a mark) so the gate is deterministic. Flaky gate + loose
  shell chaining = bad pushes; fixed both.

## After `db:reset` (or any dev.db delete), restart the dev server (2026-06-20)

**Self-caught during the prisma-migrate adoption:** after `npm run db:reset` rebuilt
`prisma/dev.db`, all 14 sign-up-based e2e specs failed at "Signed in as <name>". The migrate
change was a red herring — unit tests (which use `test.db`) were green. The cause: a
background `npm run dev:phone` started earlier in the session still held an **open SQLite
handle to the now-deleted `dev.db` inode**. Playwright's `reuseExistingServer: true` reused
that zombie server, whose auth/db writes went to the unlinked ghost file, so no user ever
appeared signed in.
- **Rule:** deleting/recreating the SQLite db file (`db:reset`, manual `rm dev.db`, a fresh
  `migrate`) **invalidates any running dev server's connection** — restart the dev server
  afterward. `db-reset.sh` now warns when a server is up on :3000.
- **Debugging tell:** a broad e2e failure where *only* dev-server/e2e specs break while
  unit/`test.db` specs pass points at the **dev.db / running-server**, not the code under
  change. Check for a stale `next dev` before suspecting the diff.
- Ties to the dev-loop: the orchestrator owns the `dev:phone` process — after a `db:reset`,
  relaunch it so phone testing hits the fresh db too.
