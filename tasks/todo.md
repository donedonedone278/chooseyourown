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

Implemented strictly test-first; `npm test` is green (lint, typecheck, 49 unit/component
tests, 11 e2e tests including the new spec).

**Data model** — added `ChapterView` (`@@unique([chapterId, viewerKey])`) and
`Chapter.viewCount Int @default(0)` plus back-relations on `Chapter`/`User`, as specced.
Applied via `prisma db push --skip-generate && prisma generate`.

**Domain helper (`src/lib/views.ts`)** — `recordView` runs the `ChapterView` create +
`Chapter.viewCount` increment in a `$transaction`, swallows `P2002` as a quiet idempotent
no-op, and skips the increment when `userId === authorId` (still records the row). Returns
`{ counted }`. `getReadChapterIds(userId, chapterIds)` returns the matching `Set<string>`.
Covered by `tests/unit/views.test.ts` (5 tests): new-viewer increment, idempotent repeat,
author-view exclusion, distinct user/device keys, and the read-id lookup. Added
`createView` to `src/test/factories.ts`, additive per the coordination note.

**Wiring** — `src/actions/view-actions.ts` (per the deviation note, not `src/lib/`) holds
`recordViewAction`, which resolves the viewer (`user:<id>` when signed in, else a
`deviceId` httpOnly cookie lazily set via `next/headers` `cookies()`) and calls
`recordView`. The chapter page (`src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`)
calls it on every render — idempotent, so refreshes don't inflate the count — and also
loads `getReadChapterIds` for the current user to flag which of the chapter's choices are
already read. The homepage (`src/app/page.tsx`) does the same for the feed.

**Display** — `ChapterReader`'s Reactions section shows a plain "N views" line next to the
like count (no icon styling, per the out-of-scope note).

**Read marks — deviation from the original component design.** The plan's
`read-marker.tsx` sketch (a render-prop component taking `children: (isRead) => ReactNode`)
doesn't work: it would be rendered from server components (`ChapterReader`,
`RecentChapterFeed`), and React Server Components reject function props/children crossing
the server→client boundary (confirmed by a real runtime 500 — "Functions are not valid as a
child of Client Components" — caught while writing the e2e spec, *before* declaring done).
Fixed by splitting into:
- `src/components/chapters/read-marker.tsx` — now exports `useLocalReadIds()` (a hook
  backed by `localStorage`, read set key `readChapterIds`) and `MarkChapterRead` (a
  render-nothing client component that adds the current chapter id to that set on mount).
  Both take only serializable/no props across the boundary.
- `src/components/chapters/choice-list.tsx` (new) and `src/components/feed/feed-list.tsx`
  (new) — small client components that own rendering the choices list / feed cards. They
  take serializable data (`choices`/`chapters` arrays + `isSignedIn`) from their server
  parents and resolve `read` per item: server-sourced `choice.read`/`chapter.read` when
  signed in, `useLocalReadIds()` when logged out.
- `ChapterReader` renders `<MarkChapterRead chapterId={chapterId} />` for logged-out
  viewers (signed-in read-state is already captured server-side by `recordViewAction`'s
  `ChapterView` row) and delegates choice rendering to `ChoiceList`; `RecentChapterFeed`
  delegates to `FeedList`.
- `read-marker.test.tsx` was rewritten against the new hook/component API (still jsdom,
  still covers: ids matching localStorage report read, others report unread, no stored set
  means everything unread, and `MarkChapterRead` writes the id on mount).

**Final test counts** — unit/component (Vitest): 10 files, 49 tests passed (includes 5 new
in `tests/unit/views.test.ts`, 3 new/rewritten in `read-marker.test.tsx`). E2e (Playwright,
chromium): 11 specs passed, including the new `tests/e2e/views-reads.spec.ts` (author's own
view doesn't bump the count; a same-reader reload is idempotent; a second reader bumps it
to 2; the chapter shows as read on the feed afterward). Full `npm test` (lint → typecheck →
unit → e2e) is green.

**Not built (per the plan's explicit out-of-scope / fast-follow list)** — hot-score feed
ranking, profile stats, final stat-icon styling (the views count is plain text), and
merge-on-login of anonymous device read-history into an account.

**Housekeeping note** — found a stray orphaned `next-server` process bound to
`0.0.0.0:3000` left over from an earlier session, which made Playwright's
`reuseExistingServer` check misbehave (it tried to spin up a second server on :3001 and
then timed out). Killed it before running the e2e gate; not part of this feature's changes.
