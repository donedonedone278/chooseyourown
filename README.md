# Choose Your Own

A collaborative, branching choose-your-own-adventure website. Signed-in users start
stories and extend them by adding child chapters; readers discover fresh chapters from
a global feed and navigate stories chapter-by-chapter, choosing among child chapters at
the end of each one. Chapters carry per-user likes and can be reported for later admin
removal.

For architecture and contributor guidance, see `CLAUDE.md`. The original (now complete)
design spec and implementation plan are archived outside the repo at
`../oldplans/chooseyourown/`.

## Local setup

Node is managed with [Volta](https://volta.sh) and pinned in `package.json` — install
Volta once and it will pick up the project's pinned Node version automatically.

```bash
curl https://get.volta.sh | bash   # once per machine
npm install                        # also runs `prisma generate` via postinstall
cp .env.example .env               # then set AUTH_SECRET to a long random string
npm run db:reset                   # migrate + seed: official tags, demo accounts, 5 stories
npx playwright install chromium    # browser for the e2e test stage
```

`DATABASE_URL` (SQLite, e.g. `file:./dev.db`) and `AUTH_SECRET` (Auth.js JWT signing)
are both required — see `.env.example`. `.env` and `*.db` are gitignored.

## Commands

```bash
npm run dev             # Next.js dev server on :3000 (localhost only)
npm run dev:phone       # dev server reachable from a phone on the LAN; prints the URL
npm run build
npm run lint            # next lint (eslint-config-next, core-web-vitals)
npm run typecheck       # tsc --noEmit
npm run test:unit       # Vitest: domain/unit + jsdom component tests
npm run test:e2e        # Playwright: browser journeys (chromium) — own db + port :3100
npm test                # full local gate: lint → typecheck → unit → e2e (fail-fast)
npm run db:reset        # rebuild dev db: migrate → setup seed (tags) → dev seed (stories)
npm run db:seed:dev     # re-run just the idempotent dev-data seed (stories + accounts)
```

## Testing from a phone

`npm run dev:phone` serves the app to other devices on your wifi and prints the URL to
open. It relies on a one-time Windows port-forwarding setup (kept current by a logon
task) — see `scripts/README.md`. Intended for a trusted home network over plain HTTP only.

## Architecture

- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Prisma ORM over SQLite.
  `@/*` is aliased to `src/*`.
- **Data model:** a `Story` owns many `Chapter`s and points at one root chapter; chapters
  form a tree via self-referential parent/child relations. Reads are server-rendered;
  writes go through server actions and route handlers.
- **Content:** chapter bodies are stored as restricted, portable Markdown
  (`src/lib/rich-text.ts` validates server-side; `MarkdownContent` renders with an
  element allowlist). The Markdown editor is decoupled from storage.
- **Moderation:** chapters are soft-deleted (`deletedAt`) rather than hard-deleted.
  Likes are one-per-user-per-chapter; reports feed an admin review queue at
  `/admin/reports`, where an admin can remove the reported chapter.

## Testing tiers

| Tier | Tool | Targets |
| --- | --- | --- |
| Domain/logic | Vitest (node env, default) | pure `src/lib/*` modules, Prisma helpers |
| Client components | Vitest (jsdom) + Testing Library | `'use client'` components |
| Server-rendered & full flows | Playwright | server components, auth, end-to-end journeys |

See `CLAUDE.md` for conventions (test factories, selector scoping, unique test inputs,
the test-first workflow). The original design/plan docs are archived at
`../oldplans/chooseyourown/`.
