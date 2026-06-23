# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collaborative, branching choose-your-own-adventure website. Signed-in users start stories and extend them by adding child chapters; readers discover fresh chapters from a global feed and navigate stories chapter-by-chapter, choosing among child chapters at the end of each one. Chapters carry per-user likes and can be reported for later admin removal. The MVP is complete; work now is enhancements on top of it.

This `CLAUDE.md` and the code are the source of truth for current scope. The original product/design spec and the original 8-task implementation plan are archived outside the repo at `../oldplans/chooseyourown/` (the `2026-06-12-*` files) — kept for history, deliberately out of tree because completed plans tend to confuse new agents. Don't treat them as current scope.

Two divergences from that old plan are worth knowing up front: chapter content is **Markdown**, not the originally-planned Tiptap/JSON (see Architecture), and Node is pinned with **Volta** (see Environment).

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Prisma ORM over SQLite. `@/*` is aliased to `src/*` — configured in both `tsconfig.json` and `vitest.config.ts`, so keep them in sync. Read surfaces stay server-rendered; mutations go through server actions + route handlers.

**Data model (`prisma/schema.prisma`) — the heart of the app:**
- `Story` owns many `Chapter`s and points to one `rootChapterId` (the entry chapter).
- `Chapter` is a self-referential tree via the `ChapterChildren` relation (`parentChapterId` → `childChapters`). A chapter belongs to exactly one story; a non-root chapter has exactly one parent.
- Chapter body is stored as standard **Markdown** (`Chapter.content`, a `String`) — chosen for portability/export, not an editor-specific JSON blob. `validateChapterContent` (`src/lib/rich-text.ts`) validates it server-side: parse to an mdast AST and allowlist node types (paragraph/text/bold/italic), rejecting links, images, headings, code, raw HTML, etc. Render with `MarkdownContent` (`react-markdown` + element allowlist). The editor (`chapter-editor.tsx`) is a Markdown textarea + preview, deliberately decoupled from storage so it can be swapped without touching the stored format. Always run content through `validateChapterContent` before persisting.
- Soft deletion: chapters are removed by setting `deletedAt`, never hard-deleted. Queries must filter `deletedAt: null`; admin removal sets the timestamp.
- `ChapterLike` enforces one like per user per chapter via `@@unique([chapterId, userId])` — duplicate likes surface as Prisma error `P2002` and should be translated to a domain error, not leaked.
- `ChapterReport` records reports for later admin review; publication is immediate, so moderation is post-hoc only.

**Domain helpers live in `src/lib/`**, not in pages/actions:
- `db.ts` — Prisma client singleton (guarded against hot-reload duplication).
- `chapters.ts` — invariant-enforcing creators (`createStoryWithRootChapter` runs in a `$transaction`; `createChildChapter` validates parent belongs to the story and isn't deleted).
- `stories.ts` — story/feed queries.

**Ordering rule:** in the option select, realized (already-written) choices always list before unclaimed suggested prompts; within each group, order is creation order (`createdAt ASC`) so the UI stays stable as like counts change. Don't sort choices by likes. Enforced centrally in `getChapterWithChoices` (`src/lib/chapters.ts`).

## Commands

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # Next.js dev server on :3000 (localhost only)
npm run dev:phone      # dev server reachable from a phone on the LAN; prints the URL
npm run phone:url      # print JUST the phone URL (no server) — handy after backgrounding dev:phone
npm run build
npm run lint           # next lint (eslint-config-next, core-web-vitals)
npm run typecheck      # tsc --noEmit
npm run test:unit      # Vitest: domain/unit tests
npm run test:e2e       # Playwright: browser journeys (chromium) — isolated db + port :3100
npm test               # full local gate: lint → typecheck → unit → e2e (fail-fast)
npm run check          # same gate, low-noise: one ✓ line per stage, output only for a failure
npm run db:reset       # rebuild dev db from scratch: drop → migrate deploy → setup seed → dev seed
npm run where          # "where were we?" snapshot: branch, uncommitted, recent commits, unmerged branches, todo + server state
```

`npm test` is the single pre-commit gate; run it before committing. Each stage is also runnable standalone (above), and `npm run check` is the quieter variant. Run a single test:

```bash
npm run test:unit -- tests/unit/chapters.test.ts   # one unit file
npm run test:unit -- -t "creates a root chapter"   # one unit test by name
npm run test:e2e -- tests/e2e/home.spec.ts         # one Playwright spec
```

Always run e2e through the `test:e2e` wrapper, never a raw `npx playwright test`: the wrapper builds/migrates/seeds the isolated `e2e.db` and binds the server to it on :3100 (see Testing). A raw invocation skips that setup.

## Branches and workflow

`develop` is the active integration branch; `main` is the eventual release target.

**Two people contribute concurrently**, so `develop` moves under you — always treat `origin/develop` as the source of truth and re-sync before you branch and before you merge. Integration stays local (no PR flow): each contributor pulls `develop`, merges their own branch, and pushes.

The only live signal of who's working on what is **the remote branch list**: a published `feat/*`/`fix/*`/`chore/*` branch means that ticket is taken. A branch that never leaves your machine is invisible to the other person, so the non-negotiable rule is **publish the branch the moment you claim a ticket** — before you write a line of code. `npm run claim` does this for you (step 1).

**For every enhancement or feature, follow this loop:**

1. **Check claims, then claim + publish.** `git fetch -p`, then `npm run where` (or `git branch -r`) to see active claims so you don't grab a ticket the other contributor started. Then `npm run claim feat/<initials>-<short-name>` (or `fix/…`/`chore/…`): it syncs `develop` (`git pull --ff-only`, so you don't branch off a stale tree), refuses the name if it's already claimed on the remote, creates the branch, and `git push -u`s it to publish the claim. (Initials prefix so two contributors don't collide on a name.) By hand is fine too — just push immediately.

2. **Write a plan** for the change (executable by an agent) into `tasks/todo.md`. The plan lives only on the feature branch — see step 5; it never reaches `develop`, so two in-flight features never fight over this file.

3. **Have Sonnet implement the plan** (subagent), test-first (see Testing), until `npm test` is green. Implement on the normal feature branch in the main working tree (the subagent shares it) — never use git worktrees / `isolation: worktree`: they lack `node_modules`, fork the checkout confusingly, and aren't how we work here. Part of the feature is updating the demo seed (see Seed data) — decide explicitly whether it should show, and for anything user-visible the answer is almost always yes.

4. **Get the user's approval** of the result. ("The user" = whichever contributor owns the branch; you approve and merge your own work — there's no cross-review gate.)

5. **Clean up, then sync + merge + push:**
   - Reset `tasks/todo.md` to the empty placeholder and commit that **on the feature branch** (clearing the finished plan + Review). This keeps `develop`'s `tasks/todo.md` permanently at the placeholder so concurrent merges never conflict on it. (`tasks/todo.md` holds only the current feature's plan; `tasks/lessons.md` is the durable record.)
   - `git checkout develop && git pull --ff-only` (pick up the other contributor's merges), `git merge --no-ff <branch>`, run the gate, and push — chaining the gate and push with `&&`, never `;`, so a red gate can never ship: `npm test && git push`. If the push is rejected as non-fast-forward, someone merged between your pull and push — `git pull --ff-only` and re-push (don't force).
   - **Conflicts during `git merge --no-ff` → stop for re-approval.** The user's approval covered the branch as it stood, not a conflict resolution you authored. Resolve the conflicts, present the resolution, and get a fresh approval before completing the merge commit, running the gate, or pushing. (A clean merge needs no re-approval.)
   - **Clear the claim:** delete the merged branch on both ends — `git push origin --delete <branch>` and `git branch -d <branch>` — so it stops reading as "in progress."
   - **Retire the backlog entry:** if the work came from a `tasks/backlog.md` entry, flip its `_status: …_` to `_status: done (<YYYY-MM-DD>)_` and add a brief **`Shipped (<date>):`** note (what actually landed + any divergence from the decided spec). Then **move the whole entry verbatim to `tasks/shipped.md`** (newest at the bottom) — don't delete it; that file is the durable trail of done work, and removing finished entries keeps `backlog.md` a list of *open* work only. If the feature only **partially** satisfies the entry, instead set `_status: partially shipped (<date>)_`, add the `Shipped`/`Still TODO` notes, and **leave it in `backlog.md`** — only move it once the rest lands. Standalone doc edit — commit it straight to `develop` and push (the branch is already gone).

Once the subagent returns green, the main session (not the subagent) exposes the change for phone testing — see Phone preview; don't wait to be asked.

**Authorization:** commit freely on the feature branch to checkpoint progress without asking. Do not merge into `develop` without explicit user approval. Always ask before touching `main` or rewriting shared history (force-push, rebase of pushed commits). Shipping `develop → main` is a single deliberate release step — coordinate it; don't let both contributors push `main` independently.

**Working agreements:**
- Doc/procedure changes discovered while working on a feature ride on that feature branch — they travel with the work that surfaced them, not a separate `develop` commit. Standalone doc chores unrelated to active feature work may go straight to `develop`.
- When we hit a flaw in our own process, fix the procedure here rather than working around it — otherwise we re-hit it every time.
- Don't put multi-step `&&` command chains in docs — add a script under `scripts/` (and an npm alias) instead, the way `dev:phone` and `npm test` already are.

## Phone preview (do this without being asked)

After a user-facing change is built and `npm test` is green, make it pokeable from the user's phone and hand them the URL — a standing workflow, not something to wait for a reminder on.

The orchestrator (main session) runs `npm run dev:phone`, never an implementing subagent: a subagent's background processes are killed when its turn ends, so a `dev:phone` it starts is dead before the user can look. The main session's background process persists across turns and can be relaunched if it's cleaned up. So:

1. When the implementing subagent reports `npm test` green, the main session starts (or reuses) `npm run dev:phone` in the background — it binds `0.0.0.0` and prints the `http://<LAN-IP>:3000` URL. Don't stack duplicates; reuse a running one.
2. Hand the user the phone URL and a one-line "what to try." If the preview was cleaned up between turns and the user is (or may be) looking, just relaunch it.

`npm run dev:phone` is the only command needed; LAN port-forwarding (WSL2 → Windows → wifi) is kept current by a Windows logon task. See `scripts/README.md` for the full setup (`scripts/windows/wsl-port-forward-setup.ps1`, elevated), an inventory of the Windows-side artifacts it creates, and the one-shot teardown (`scripts/windows/wsl-port-forward-teardown.ps1`) for fully removing LAN access.

## Testing conventions

Three test tiers — keep each one in its lane:

| Tier | Tool | Targets |
| --- | --- | --- |
| Domain/logic | Vitest (node env, default) | pure `src/lib/*` modules, Prisma helpers |
| Client components | Vitest (jsdom) + Testing Library | `'use client'` components |
| Server-rendered & full flows | Playwright | server components, auth, end-to-end journeys |

Tests are written **test-first**: write the failing test, confirm it fails, implement, confirm it passes, then commit. Follow that rhythm throughout a plan.

- **Vitest** (`vitest.config.ts`): default environment is node, `globals: true`, `fileParallelism: false` (tests share one SQLite DB, so they run serially). `src/test/global-setup.ts` sets `DATABASE_URL` to `file:./test.db`, deletes any existing `prisma/test.db`, then runs `prisma migrate deploy` so each run starts clean from the committed migrations — the suite exercises the real migration history (a broken migration fails the gate), not just the latest schema. `--force-reset` is blocked for agents, hence the manual file delete + non-interactive `migrate deploy`. JSX uses the automatic runtime via esbuild (no `@vitejs/plugin-react`, which pins a newer Vite than Vitest ships). Include globs cover `src/**/*.{test,spec}.{ts,tsx}` and `tests/unit/**`; e2e is excluded.
- Use the factories in `src/test/factories.ts` (`createUser`, `createStory`, `createChapter`) for test data — they upsert authors and generate unique fields, so don't hand-roll Prisma inserts.
- **Unit (node-tier) tests must not import server-only code** — server components, `src/lib/auth.ts`, or anything pulling in `next-auth`/`next/server`. They can't load in Vitest's node environment and fail the whole file at import time. Test pure domain/lib modules here; exercise auth and server components through Playwright.
- **Client-component tests** opt into jsdom with a `// @vitest-environment jsdom` docblock on the first line and use `@testing-library/react` (`render`/`screen`). `@testing-library/jest-dom` matchers are registered globally via `src/test/setup-dom.ts`.
- **Playwright** (`playwright.config.ts`): chromium only, run isolated from the dev/preview db. `scripts/test-e2e.sh` (the `test:e2e` target) rebuilds `prisma/e2e.db` (drop → migrate → setup seed → dev seed) and runs Playwright against a dev server on **:3100** bound to that db (`baseURL http://127.0.0.1:3100`, `reuseExistingServer: false`). So `npm test` never writes to `dev.db`, and a running `npm run dev:phone` (:3000) is never reused or clobbered. Browser coverage is first-class — new user-facing features should land with an e2e spec.
- **Scope e2e queries to a landmark region** (`page.locator('header' | 'main' | 'nav').getByRole(...)`) rather than the whole page — it makes assertions intention-revealing and avoids strict-mode collisions when an accessible name legitimately appears in both nav and page content. (See also the accessible-name rule in UI principles.)
- E2e rows land in `e2e.db`, rebuilt fresh once per suite run but shared across all parallel workers within that run (no per-test reset), so tests must use unique inputs per run. `Date.now()` alone isn't enough — parallel spec files can collide on the same millisecond. Add randomness: ``const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;`` then `` `riley-${stamp}@example.com` ``.

## UI principles

**Visuals over words; symbols over labels; show, don't narrate.** Keep the UI calm and scannable — lean on intuitive signals (icon, glyph, dimming, color, weight, position) and let controls explain themselves, instead of spelling things out in prose.

- Status → a visual signal, not a word. A *read* chapter is shown by dimming its card (visited-link metaphor), not by printing "Read".
- Actions → a symbol plus the fewest words that stay clear. Prefer a glyph, adding a short label only when the glyph alone is ambiguous. A back control is `←` (or `← Back`), not "Back to the previous chapter"; likes are a ♥ with a count, not the word "likes".
- Don't narrate affordances the UI already makes obvious. A visible Bold/Italic toolbar doesn't need "Select text and use Bold/Italic…" beneath it — the buttons say it.

Terseness is about pixels, never the accessible name. Every visual- or symbol-only signal still needs a non-visual equivalent — an `aria-label`/`title`/`.sr-only` carrying the meaning the glyph implies ("Back to parent chapter", "12 likes"). Don't give two interactive elements the same accessible name *and* destination; differentiate the copy instead (e.g. nav "Start a story" vs. homepage hero "Write the first chapter"). When an e2e test needs to assert state, prefer a `data-*` hook over visible text.

## Seed data

Two seeds, distinct jobs — never hand-insert rows into the db, run a throwaway script, or tweak data as a one-off. The phone preview and the next contributor's `db:reset` only ever see what the seeds create, so anything not seeded effectively does not exist.

- `prisma/seed.ts` — the **setup** seed: official tags only, no content. Don't add users/stories/chapters here.
- `prisma/seed-dev.ts` — the **dev-data** seed: all users/stories/chapters, the data the phone preview is built from (`npm run db:reset` runs it after the setup seed).

Updating `seed-dev.ts` is part of every user-visible feature. Seed it thoroughly, not with one token example: the feature should appear across many chapters/stories and in every meaningful state (a new edge/option/flag on lots of nodes, at varying depths, in each on/off or claimed/unclaimed variant) so it can be exercised the moment the preview comes up. A new field that distinguishes two things (e.g. a choice label vs. a chapter title) must be seeded with the two values *different* across a representative spread, or the seed silently fails to demo the very thing it adds.

## Environment

Development runs on **WSL2** (Linux subsystem on a Windows host). Keep the repo on the Linux filesystem (`/home/...`) rather than under `/mnt/c/...` — that's what keeps `npm install`, file watching, and HMR fast. The dev server binds `127.0.0.1:3000`; WSL2's localhost forwarding makes that reachable from the Windows browser. Playwright runs headless Chromium out of the box; headed mode would need an X server / WSLg.

**Node is managed with [Volta](https://volta.sh)** and pinned in `package.json` (`"volta": { "node": "..." }`) — treat the runtime like any other versioned dependency, not a system install. Don't rely on the distro's `apt` Node; install Volta once (`curl https://get.volta.sh | bash`) and it auto-selects the pinned version per project. Favor higher versions: keep Node on a current LTS and dependencies up to date, bumping the pin/deps deliberately (an old Node is what forced earlier tooling workarounds). Volta's shims only activate in interactive shells, so non-interactive/CI invocations need `$HOME/.volta/bin` on `PATH` first — rather than prefixing `export PATH=...` on every command, source `scripts/volta-env.sh`, wired via `BASH_ENV` in the gitignored `.claude/settings.local.json` (local only, never shared). See `scripts/README.md`.

`DATABASE_URL` (SQLite, e.g. `file:./dev.db`) and `AUTH_SECRET` (Auth.js JWT signing) are both required. Unit tests default `DATABASE_URL` to `file:./test.db` and the browser suite uses `file:./e2e.db`, so neither touches `dev.db`. `.env` and `*.db` are gitignored.

First-time local setup (these artifacts don't live in git, so a fresh clone needs them):

```bash
curl https://get.volta.sh | bash   # once per machine; gives you the pinned Node
npm install
printf 'DATABASE_URL="file:./dev.db"\nAUTH_SECRET="%s"\n' "$(openssl rand -base64 33)" > .env
npm run db:reset                   # build the dev SQLite db from migrations + seed demo data
npx playwright install chromium    # browser for the e2e stage of `npm test`
```

**Schema changes go through Prisma Migrate, never `db push`** (retired, so schema history stays reviewable and reproducible). Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <short-desc>` to generate + apply a migration under `prisma/migrations/`, and commit it — migrations are version-controlled. `npm run db:reset` rebuilds the dev db from scratch (drop → `migrate deploy` → setup seed → dev seed) any time you want a clean, known state with demo data; it's idempotent. Tests apply migrations via `migrate deploy`.
