# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collaborative, branching choose-your-own-adventure website. Signed-in users start stories and extend them by adding child chapters; readers discover fresh chapters from a global feed and navigate stories chapter-by-chapter, choosing among child chapters at the end of each one. Chapters carry per-user likes and can be reported for later admin removal.

The original product/design spec and the 8-task implementation plan are **complete** and
have been archived **outside the repo** at `../oldplans/chooseyourown/` (the
`2026-06-12-*` files). They're kept for history but deliberately out of tree — completed
plans/designs tend to confuse new agents. Don't treat them as current scope; this
`CLAUDE.md` and the code are the source of truth now.

## Current state

The MVP is **complete** (original plan Tasks 1–8): app scaffold; Prisma data model +
domain helpers; the Vitest DB harness; Auth.js credentials auth + route protection;
Markdown content with server-side validation; the story / child-chapter writing flow;
the chapter reader (choices show like counts); the homepage recent-chapters feed; the
story-overview page; per-user likes; reporting + the admin removal surface
(`/admin/reports`); and full-journey e2e + seed + README. Stack divergences from the old
plan: chapter content is **Markdown** (not Tiptap/JSON), and **Volta** pins Node (see
"Environment"). `npm test` is green.

## Branches and workflow

`develop` is the active integration branch; `main` is the eventual release target.

**Two people contribute concurrently**, so `develop` moves under you — always treat
`origin/develop` as the source of truth and re-sync before you branch and before you merge.
Integration stays **local** (no PR flow): each contributor pulls `develop`, merges their
own branch, and pushes.

**For every enhancement or feature, follow this loop:**
1. **Sync, then branch from `develop`** — `git checkout develop && git pull --ff-only`
   first so you're not basing on a stale tree, then branch
   `feat/<initials>-<short-name>` or `fix/<initials>-<short-name>` (initials prefix so two
   contributors don't collide on the same branch name).
2. **Write a plan** for the change (an implementation plan an agent can execute) into
   `tasks/todo.md`. The plan lives **only on the feature branch** — see step 5; it never
   reaches `develop`, so two in-flight features never fight over this file.
3. **Have Sonnet implement the plan** (subagent), strictly test-first, until `npm test` is
   green. **Never use git worktrees / `isolation: worktree` for this** — implement on the
   normal feature branch in the main working tree (the subagent shares it). Worktrees lack
   `node_modules`, fork the checkout in confusing ways, and aren't how we work here.
4. **Get the user's approval** of the result. ("The user" = whichever contributor owns the
   branch; you approve and merge your own work — there's no cross-review gate.)
5. **Reset `tasks/todo.md` on the branch, then sync + merge + push:**
   - First commit the `tasks/todo.md` reset to the empty working-slot placeholder **on the
     feature branch** (clearing the finished plan + Review). This keeps the plan on the
     branch and out of `develop` entirely — `develop`'s `tasks/todo.md` stays the
     placeholder permanently, and concurrent merges never conflict on it. `tasks/todo.md`
     holds only the *current* feature's plan; `tasks/lessons.md` is the durable record.
   - Then `git checkout develop && git pull --ff-only` (pick up the other contributor's
     merges), `git merge --no-ff <branch>`, run `npm test` once on the integrated result,
     and `git push`. If the push is rejected as non-fast-forward, someone merged between
     your pull and push — `git pull --ff-only` and re-push (don't force).

**Authorization:** commit freely *on the feature branch* to checkpoint progress without
asking. **Do not merge into `develop` without explicit user approval.** Always ask before
touching `main` or rewriting shared history (force-push, rebase of pushed commits). Shipping
`develop → main` is a single deliberate release step — coordinate it (don't let both
contributors push `main` independently).

**Doc/procedure changes discovered while working on a feature ride on that feature branch**
— don't split them into a separate `develop` commit; they travel with the work that
surfaced them. (Standalone doc chores unrelated to active feature work may still go straight
to `develop`.) And when we hit a flaw in our own process, **fix the procedure here, don't
work around it** — otherwise we re-hit it every time.

Once the subagent returns green, the **main session** (not the subagent) exposes the change
for phone testing per the "Development loop" below — don't wait to be asked.

## Commands

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # Next.js dev server on :3000 (localhost only)
npm run dev:phone      # dev server reachable from a phone on the LAN; prints the URL
npm run build
npm run lint           # next lint (eslint-config-next, core-web-vitals)
npm run typecheck      # tsc --noEmit
npm run test:unit      # Vitest: domain/unit tests
npm run test:e2e       # Playwright: browser journeys (chromium)
npm test               # full local gate: lint → typecheck → unit → e2e (fail-fast)
```

`npm test` is the single pre-commit gate. Run it before committing; each stage is also runnable standalone (above).

Run a single unit test file / name:
```bash
npm run test:unit -- tests/unit/chapters.test.ts
npm run test:unit -- -t "creates a root chapter"
```

Run a single Playwright spec:
```bash
npx playwright test tests/e2e/home.spec.ts --project=chromium
```

## Development loop (do this without being asked)

After a user-facing change is built **and** `npm test` is green, make it pokeable from the
user's phone and hand them the URL — standing workflow, not something to wait for a reminder on.

**The orchestrator (main session) runs `npm run dev:phone`, never an implementing subagent.**
A subagent's background processes are killed when its turn ends, so a `dev:phone` it starts
is dead before the user can look. The main session's background process persists across
turns, and the main session can relaunch it if it's ever cleaned up between turns. So:

1. When the implementing subagent reports `npm test` green, the **main session** starts (or
   reuses) `npm run dev:phone` in the background — it binds `0.0.0.0` and prints the
   `http://<LAN-IP>:3000` URL. Don't stack duplicates; reuse a running one. Do **not**
   instruct the subagent to start it.
2. Hand the user the phone URL and a one-line "what to try." If the preview was cleaned up
   between turns and the user is (or may be) looking, just relaunch it.

`npm run dev:phone` is the only command needed; LAN port-forwarding (WSL2 → Windows → wifi)
is kept current by a Windows logon task. See `scripts/README.md` for the full setup
(`scripts/windows/wsl-port-forward-setup.ps1`, elevated), a complete inventory of the
Windows-side artifacts it creates, and the one-shot teardown
(`scripts/windows/wsl-port-forward-teardown.ps1`) for when the user asks to fully remove
LAN access. Don't put multi-step `&&` command chains in docs — add a script under `scripts/`
(and an npm alias) instead, the way `dev:phone` and `npm test` already are.

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Prisma ORM over SQLite. `@/*` is aliased to `src/*` (configured in both `tsconfig.json` and `vitest.config.ts` — keep them in sync). The plan keeps read surfaces server-rendered and uses server actions + route handlers for mutations.

**Data model (`prisma/schema.prisma`) — the heart of the app:**
- `Story` owns many `Chapter`s and points to one `rootChapterId` (the entry chapter).
- `Chapter` is a self-referential tree via the `ChapterChildren` relation (`parentChapterId` → `childChapters`). A chapter belongs to exactly one story; a non-root chapter has exactly one parent.
- **Chapter body is stored as standard Markdown** (`Chapter.content`, a `String`) — chosen for portability/export, *not* an editor-specific JSON blob. `src/lib/rich-text.ts` (`validateChapterContent`) validates it server-side: parse to an mdast AST and allowlist node types (paragraph/text/bold/italic), rejecting links, images, headings, code, raw HTML, etc. Render with `MarkdownContent` (`react-markdown` + element allowlist). The editor (`chapter-editor.tsx`) is a Markdown textarea + preview and is deliberately decoupled from storage — it can be swapped without touching the stored format. Always run content through `validateChapterContent` before persisting.
- Soft deletion: chapters are removed by setting `deletedAt`, never hard-deleted. Queries must filter `deletedAt: null` and admin removal sets the timestamp.
- `ChapterLike` enforces one like per user per chapter via `@@unique([chapterId, userId])` — duplicate likes surface as Prisma error `P2002` and should be translated to a domain error, not leaked.
- `ChapterReport` records reports for later admin review; publication is immediate, so moderation is post-hoc only.

**Domain helpers live in `src/lib/`**, not in pages/actions:
- `db.ts` — Prisma client singleton (guarded against hot-reload duplication).
- `chapters.ts` — invariant-enforcing creators (`createStoryWithRootChapter` runs in a `$transaction`; `createChildChapter` validates parent belongs to the story and isn't deleted).
- `stories.ts` — story/feed queries.

**Ordering rule:** child-chapter choices render in creation order (`createdAt ASC`) so the UI stays stable as like counts change. Don't sort choices by likes.

## UI principles

**Visuals over words.** Prefer an intuitive visual signal — dimming, color, weight, iconography, position — over literal status text. A *read* chapter, for example, is shown by **dimming its card** (visited-link metaphor), not by printing the word "Read". This keeps the UI calm and scannable. Always pair the visual with a non-visual equivalent for accessibility (a `.sr-only` label, `aria-*`, or `title`) so screen-reader users aren't left out, and prefer a `data-*` hook over visible text when an e2e test needs to assert the state.

## Testing conventions

Three test tiers — keep each one in its lane:

| Tier | Tool | Targets |
| --- | --- | --- |
| Domain/logic | Vitest (node env, default) | pure `src/lib/*` modules, Prisma helpers |
| Client components | Vitest (jsdom) + Testing Library | `'use client'` components |
| Server-rendered & full flows | Playwright | server components, auth, end-to-end journeys |

- **Vitest** (`vitest.config.ts`): default environment is **node**, `globals: true`, `fileParallelism: false` (tests share one SQLite DB, so they run serially). `src/test/global-setup.ts` sets `DATABASE_URL` to `file:./test.db`, deletes any existing `prisma/test.db`, then runs `prisma db push --skip-generate` so each run starts from a clean schema-synced db (Prisma's `--force-reset` is blocked when invoked by an agent, hence the manual file delete). JSX uses the automatic runtime via esbuild (no `@vitejs/plugin-react`, which pins a newer Vite than Vitest ships). Include globs cover `src/**/*.{test,spec}.{ts,tsx}` and `tests/unit/**`; e2e is excluded.
- Use the factories in `src/test/factories.ts` (`createUser`, `createStory`, `createChapter`) for test data — they upsert authors and generate unique fields, so don't hand-roll Prisma inserts in tests.
- **Unit (node-tier) tests must not import server-only code** — server components, `src/lib/auth.ts`, or anything that pulls in `next-auth`/`next/server`. Those can't load in Vitest's node environment and will fail the whole file at import time. Test pure domain/lib modules there; exercise auth and server components through Playwright instead.
- **Client-component tests** opt into jsdom with a `// @vitest-environment jsdom` docblock on the first line and use `@testing-library/react` (`render`/`screen`). `@testing-library/jest-dom` matchers are registered globally via `src/test/setup-dom.ts`.
- **Playwright** (`playwright.config.ts`): chromium only, baseURL `http://127.0.0.1:3000`, auto-starts `npm run dev` and reuses an existing server. The plan treats browser coverage as first-class — new user-facing features should land with an e2e spec.
- **Scope e2e queries to a landmark region** (`page.locator('header' | 'main' | 'nav').getByRole(...)`) rather than querying the whole page. This is the standing convention — it makes assertions intention-revealing and avoids strict-mode collisions when the same accessible name legitimately appears in nav and page content. Don't give two interactive elements the same accessible name *and* destination; differentiate the copy instead (e.g. nav "Start a story" vs homepage hero "Write the first chapter").
- E2e tests that create rows in the shared dev db must use unique inputs per run so they stay repeatable (there is no per-test db reset for the browser suite yet). `Date.now()` **alone is not enough** — Playwright runs spec files in parallel workers, so two specs sharing an email prefix can collide on the same millisecond. Add randomness: ``const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;`` then `` `riley-${stamp}@example.com` ``.
- The plan is strictly **test-first**: write the failing test, confirm it fails, implement, confirm it passes, then commit. Follow that rhythm when continuing the plan.

## Environment

Development runs on **WSL2** (Linux subsystem on a Windows host). Keep the repo on the Linux filesystem (`/home/...`, where it currently lives) rather than under `/mnt/c/...` — that's what keeps `npm install`, file watching, and HMR fast. The dev server binds `127.0.0.1:3000`; WSL2's localhost forwarding makes that reachable from the Windows browser. Playwright runs headless Chromium (works out of the box); *headed* mode would need an X server / WSLg.

**Node is managed with [Volta](https://volta.sh) and pinned in `package.json`** (`"volta": { "node": "..." }`) — treat the runtime like any other versioned project dependency, not a system install. Don't rely on the distro's `apt` Node; install Volta once (`curl https://get.volta.sh | bash`) and it auto-selects the pinned version per project. **Favor higher versions when possible**: keep Node on a current LTS and dependencies up to date, bumping the pin/deps deliberately rather than letting an old system default dictate the floor (an old Node is what forced earlier tooling workarounds). Note: Volta's shims only activate in interactive shells by default, so non-interactive/CI invocations may need `export PATH="$HOME/.volta/bin:$PATH"` (or an equivalent) first.

`DATABASE_URL` (SQLite, e.g. `file:./dev.db`) and `AUTH_SECRET` (Auth.js JWT signing) are both required; tests default `DATABASE_URL` to `file:./test.db`. `.env` and `*.db` are gitignored.

First-time local setup (these artifacts don't live in git, so a fresh clone needs them):
```bash
curl https://get.volta.sh | bash   # once per machine; gives you the pinned Node
npm install
printf 'DATABASE_URL="file:./dev.db"\nAUTH_SECRET="%s"\n' "$(openssl rand -base64 33)" > .env
npx prisma db push                 # create the dev SQLite db from the schema
npx playwright install chromium    # browser for the e2e stage of `npm test`
```
