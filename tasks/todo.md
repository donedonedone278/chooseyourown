# Feature: View + read tracking (foundation)  — backlog ideas #2 + #14

**Branch:** `feat/views-reads` (off `develop`). Merge to `develop` only after user approval
(reset this file to the placeholder on the branch *before* merging — see `CLAUDE.md`).
**Plan author:** Opus. **Implementer:** Sonnet, strictly test-first. Gate: `npm test` green.
**Note:** Do NOT start `dev:phone` — the orchestrator (main session) handles the phone
preview after green (see `CLAUDE.md` → "Development loop").

## Why this first

The second parallel keystone (independent of the tagging branch — no shared files expected
beyond `schema.prisma` + factories, so coordinate the merge order). Unblocks: hot-score feed,
read/unread marks, profile stats, and view counts on choice cards. Builds the **mechanism +
read indicators only**; the feed ranking, profile stats, and styled stat icons are later waves
and are **out of scope** here.

## Decisions carried from the backlog (F3, ideas #2/#14)

- **One signal:** opening a chapter both **marks it read** and records a **unique view**.
- **Viewer identity:** signed-in → `user:<id>`; logged-out → `device:<uuid>` (a `deviceId`
  cookie). One unique row per (chapter, viewer).
- **Unique view count includes logged-out** (distinct devices; approximate). **Author's own
  views excluded** from the count (still recorded for read-state, just don't increment).
- **Read-state is hybrid:** signed-in → server rows (cross-device); logged-out → localStorage
  (instant client marks). **Merge-on-login is a fast-follow — not in this branch.**
- Read/unread shown in **both** the option-select choices and the home feed.

## Out of scope (fast-follows — note, don't build)

- Hot-score feed ranking (idea #10) — it will *consume* `Chapter.viewCount`. - Profile stats
  (idea #1). - Final stat-icon styling (symbols-over-words branch owns the `<Stat>` component;
  show a plain count for now). - Merging anonymous device read-history into an account at login.

---

## Data model — `prisma/schema.prisma` (then `npx prisma db push`)

```prisma
model ChapterView {
  id        String   @id @default(cuid())
  chapterId String
  viewerKey String                          // "user:<id>" or "device:<uuid>"
  userId    String?                          // set when signed in (for read-state queries)
  createdAt DateTime @default(now())
  chapter   Chapter  @relation(fields: [chapterId], references: [id])
  user      User?    @relation(fields: [userId], references: [id])
  @@unique([chapterId, viewerKey])          // dedupes views AND is the per-user read marker
}
```
- Add `viewCount Int @default(0)` to `Chapter` (denormalized, feeds the future hot-score),
  plus `views ChapterView[]` back-relations on `Chapter` and `User`.

## Domain helper — `src/lib/views.ts`

- `recordView({ chapterId, viewerKey, userId, authorId })` — in a `$transaction`: try to
  create the `ChapterView`; on success **and** `userId !== authorId` (and viewer not the
  author for anon-impossible case), `increment` `Chapter.viewCount`. Translate `P2002`
  (already viewed) into a quiet no-op — **idempotent**: second call by same viewer never
  double-counts. Returns `{ counted: boolean }`.
- `getReadChapterIds(userId, chapterIds)` — set of those ids the signed-in user has a
  `ChapterView` for (powers server-side read marks). Returns `Set<string>`.
- Keep all counting off soft-deleted chapters consistent with existing `deletedAt` filtering.

## Wiring

- **Device id:** ensure a `deviceId` cookie exists (cuid/uuid) — set via a tiny route handler
  or in the view-record action if absent. Used as `viewerKey` for logged-out viewers and to
  scope localStorage read-state.
- **Record on open:** when a chapter reader page renders, fire `recordViewAction` (server
  action / route handler) once per load. Resolve viewer = session user (`user:<id>`) else
  `device:<cookie>`; pass `authorId` from the loaded chapter. Fire-and-forget client effect or
  a server-side call on the chapter route — keep it idempotent so refreshes don't inflate.
- **Read marks (signed-in):** the chapter-reader choices list and the home feed call
  `getReadChapterIds(session.user.id, ids)` server-side and pass a `read` flag per item.
- **Read marks (logged-out):** a small `'use client'` enhancer reads a localStorage set
  (`readChapterIds`, keyed by deviceId) and applies the read style on mount; the chapter
  reader adds the current chapter id to that set on open.
- **Display:** show `viewCount` on the chapter view (plain "N views" for now; icon later).

## Tests (write first, watch fail, implement, watch pass)

- **Unit (node)** `tests/unit/views.test.ts` — `recordView` increments once for a new viewer;
  **second call same viewerKey → no increment** (idempotent, P2002 swallowed); **author view
  (`userId === authorId`) records the row but does NOT increment**; distinct user vs distinct
  device keys both count; `getReadChapterIds` returns exactly the viewed subset. Use factories.
- **Client (jsdom)** `src/components/chapters/read-marker.test.tsx` — given a localStorage set,
  the marker applies the "read" treatment to matching ids and not others. (`// @vitest-environment jsdom`.)
- **E2e** `tests/e2e/views-reads.spec.ts` — user A opens chapter → "1 view"; A reloads → still
  "1 view" (idempotent); user B opens → "2 views"; the **author** opening their own chapter does
  not bump the count; after reading, the chapter shows as read in the feed/option select on
  revisit. Unique `stamp` per the repo convention; scope queries to `main`.

## Step — gate, then report

```bash
npx prisma db push && npx prisma generate   # apply schema locally
npm test                                     # lint → typecheck → unit → e2e (fail-fast)
```
Commit on the branch with a clear message. **Do NOT merge to `develop`, do NOT start
`dev:phone`** — report green; the orchestrator launches the preview and seeks approval.

## File checklist

**New:** `src/lib/views.ts`, `src/lib/view-actions.ts` (record action + deviceId cookie),
`src/components/chapters/read-marker.tsx` (+ `.test.tsx`), `tests/unit/views.test.ts`,
`tests/e2e/views-reads.spec.ts`.
**Modified:** `prisma/schema.prisma`, `src/test/factories.ts` (view helper),
`src/components/chapters/chapter-reader.tsx` (record-on-open + read flags on choices),
`src/components/feed/*` (read flags on feed cards), `src/lib/stories.ts` /
chapter loaders (carry `viewCount` + read flags).

## Coordination note (two contributors)

Both keystones edit `prisma/schema.prisma` and `src/test/factories.ts`. Expect a small merge
conflict there when the second branch merges — additive only (new models / new factory fns),
so resolution is trivial: keep both. Whoever merges second: `git pull --ff-only develop`,
re-merge, reconcile the schema additively, re-run `npm test`.

## Review (fill in after implementation)

_(empty)_
