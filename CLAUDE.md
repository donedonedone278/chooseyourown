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

Implementation is in progress — roughly through plan Task 2: app scaffold, Prisma data model, chapter domain helpers, and the Vitest DB harness. Later tasks (auth, rich-text validation, writing flow, reader/feed, likes/reports/admin) are planned but **not yet built** — do not assume Auth.js, Tiptap, Zod, or bcryptjs exist until they appear in `package.json`.

## Commands

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # Next.js dev server on :3000
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

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Prisma ORM over SQLite. `@/*` is aliased to `src/*` (configured in both `tsconfig.json` and `vitest.config.ts` — keep them in sync). The plan keeps read surfaces server-rendered and uses server actions + route handlers for mutations.

**Data model (`prisma/schema.prisma`) — the heart of the app:**
- `Story` owns many `Chapter`s and points to one `rootChapterId` (the entry chapter).
- `Chapter` is a self-referential tree via the `ChapterChildren` relation (`parentChapterId` → `childChapters`). A chapter belongs to exactly one story; a non-root chapter has exactly one parent. Body text is stored as `contentJson` (a rich-text node array, not HTML).
- Soft deletion: chapters are removed by setting `deletedAt`, never hard-deleted. Queries must filter `deletedAt: null` and admin removal sets the timestamp.
- `ChapterLike` enforces one like per user per chapter via `@@unique([chapterId, userId])` — duplicate likes surface as Prisma error `P2002` and should be translated to a domain error, not leaked.
- `ChapterReport` records reports for later admin review; publication is immediate, so moderation is post-hoc only.

**Domain helpers live in `src/lib/`**, not in pages/actions:
- `db.ts` — Prisma client singleton (guarded against hot-reload duplication).
- `chapters.ts` — invariant-enforcing creators (`createStoryWithRootChapter` runs in a `$transaction`; `createChildChapter` validates parent belongs to the story and isn't deleted).
- `stories.ts` — story/feed queries.

**Ordering rule:** child-chapter choices render in creation order (`createdAt ASC`) so the UI stays stable as like counts change. Don't sort choices by likes.

## Testing conventions

- **Vitest** (`vitest.config.ts`): node environment, `fileParallelism: false` (tests share one SQLite DB, so they run serially). `src/test/global-setup.ts` sets `DATABASE_URL` to `file:./test.db` and runs `prisma db push --skip-generate` before the suite. Include globs cover `src/**/*.test.ts(x)` and `tests/unit/**`; e2e is excluded.
- Use the factories in `src/test/factories.ts` (`createUser`, `createStory`, `createChapter`) for test data — they upsert authors and generate unique fields, so don't hand-roll Prisma inserts in tests.
- **Playwright** (`playwright.config.ts`): chromium only, baseURL `http://127.0.0.1:3000`, auto-starts `npm run dev` and reuses an existing server. The plan treats browser coverage as first-class — new user-facing features should land with an e2e spec.
- The plan is strictly **test-first**: write the failing test, confirm it fails, implement, confirm it passes, then commit. Follow that rhythm when continuing the plan.

## Environment

Development runs on **WSL2** (Linux subsystem on a Windows host). Keep the repo on the Linux filesystem (`/home/...`, where it currently lives) rather than under `/mnt/c/...` — that's what keeps `npm install`, file watching, and HMR fast. The dev server binds `127.0.0.1:3000`; WSL2's localhost forwarding makes that reachable from the Windows browser. Playwright runs headless Chromium (works out of the box); *headed* mode would need an X server / WSLg.

`DATABASE_URL` is required (SQLite, e.g. `file:./dev.db`); tests default it to `file:./test.db`. Auth (planned) will add `AUTH_SECRET`. `.env` and `*.db` are gitignored.

First-time local setup (these artifacts don't live in git, so a fresh clone needs them):
```bash
npm install
printf 'DATABASE_URL="file:./dev.db"\n' > .env
npx prisma db push                 # create the dev SQLite db from the schema
npx playwright install chromium    # browser for the e2e stage of `npm test`
```
