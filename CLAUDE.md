# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collaborative, branching choose-your-own-adventure website. Signed-in users start stories and extend them by adding child chapters; readers discover fresh chapters from a global feed and navigate stories chapter-by-chapter, choosing among child chapters at the end of each one. Chapters carry per-user likes and can be reported for later admin removal.

Authoritative scope and design live in `docs/superpowers/`:
- `specs/2026-06-12-choose-your-own-adventure-design.md` — product/design spec (the source of truth for behavior and non-goals).
- `plans/2026-06-12-choose-your-own-adventure.md` — the 8-task, TDD-driven implementation plan. Read this before adding features; it dictates file layout, the tech stack, and the test-first workflow.

## Branches and current state

Active development happens on the **`develop`** branch; `main` holds the design docs and is the eventual integration target. Commit feature work to `develop`.

**Standing authorization:** commit and push to `develop` regularly without asking first — checkpoint working increments as you go (ideally with `npm test` green). Still ask before anything that rewrites shared history (force-push, rebase of pushed commits) or touches `main`.

Implementation is in progress — through plan **Task 6**: app scaffold, Prisma data model + domain helpers, the Vitest DB harness, Auth.js credentials auth, Markdown content + server-side validation, the story/child-chapter writing flow, the chapter reader (choices show like counts), the homepage recent-chapters feed, and the story-overview page. **Still to build:** likes/reports/admin removal (Task 7 — the reader shows like *counts* but there's no way to like yet), and final full-journey e2e + seed + README (Task 8). Note the stack diverged from the plan: content is **Markdown** (not Tiptap/JSON), and **Volta** pins Node — see below.

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

After building **and** testing a user-facing feature (i.e. once `npm test` is green),
make it pokeable from the user's phone and hand them the URL — this is the standing
workflow, not something to wait for a reminder on:

1. Run `npm run dev:phone` **in the background** (it binds `0.0.0.0` and prints the
   `http://<LAN-IP>:3000` phone URL). One already-running instance is fine — don't stack
   duplicates; reuse it.
2. Tell the user the phone URL and a one-line "what to try" for the feature you just built.

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
