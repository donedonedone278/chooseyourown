# Plan: User profiles (basic) — backlog item 1

Branch: `feat/ls-user-profiles`

## Decisions (locked via clarifying questions)

- **Routing:** `/users/[handle]` keyed off a new unique `User.username` ("@handle").
- **Handle assignment:** **user-chosen at sign-up** — required field, validated (format +
  reserved-words + uniqueness), with a live "✓ available" check. Existing users get a
  generated handle via a one-time backfill.
- **Content (public to everyone, incl. logged-out):** display name + `@handle`; **derivable
  stats** (# chapters contributed, # stories started, total likes received, total views); and
  the **two chapter lists** — *Newest* (createdAt desc) and *Most liked* (like count desc,
  createdAt desc tiebreak).
- **Deferred** (need unbuilt features): editable bio, follower/following counts (item 12),
  liked-stories list (item 17). Don't build these now.
- **Entry points (all link to `/users/[handle]`):** story-cover byline, homepage feed cards
  (add a byline), chapter-reader byline (add a byline).

## Schema (`prisma/schema.prisma`)  — _UPDATED: clean required+unique via migration_

- Add `username String @unique` to `User` — **required + unique** (the nullable hack is gone
  now that we've adopted Prisma Migrate). Apply with
  `npx prisma migrate dev --name add_user_username`; **commit** the generated migration under
  `prisma/migrations/`.
- **No backfill script.** There's no production data; `dev.db`/`test.db` are disposable and
  seeded. The seed sets usernames (below), and `npm run db:reset` rebuilds the dev db from the
  migration + seed. (If a real backfill were ever needed, that's a hand-edited migration —
  see `CLAUDE.md` → Environment.)
- The profile route still `notFound()`s on an unknown handle.

## Handle utilities (`src/lib/handles.ts`) — pure, unit-tested

- `slugifyHandle(displayName): string` — lowercase, spaces/underscores→`-`, strip to
  `[a-z0-9-]`, collapse/trim hyphens.
- `isValidHandle(handle): boolean` — `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$` (3–30 chars,
  no leading/trailing/double hyphen), lowercase only.
- `RESERVED_HANDLES` set — `admin, api, auth, users, stories, new, sign-in, sign-up, about,
  settings, me, null, undefined` — rejected even if well-formed.
- (No `generateUniqueHandle`/auto-fallback needed: handles are user-chosen at sign-up; the
  seed uses `slugifyHandle` on distinct demo names. `slugifyHandle` stays — it's the seed's
  handle source and a sensible default the live-availability field can prefill from.)

## Domain query (`src/lib/users.ts`) — unit-tested

- `getUserProfileByHandle(handle)` → `null` if no user. Returns `{ id, displayName,
  username, stats: { chapters, stories, likesReceived, views }, chaptersNewest[],
  chaptersMostLiked[] }`. Chapters filter `deletedAt: null`; each carries
  `{ id, title, storyId, likeCount, viewCount }`. Sort *Most liked* via
  `orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }]`. Stats:
  `likesReceived` = sum of `_count.likes` over their live chapters; `views` = sum of
  `viewCount`; `chapters`/`stories` = counts.

## Sign-up changes

- `src/app/auth/sign-up/page.tsx`: add a **Handle** input (labelled "Handle"); pull the
  field out into a small `'use client'` component that debounce-checks availability against a
  new route handler and shows ✓/✗. Server validation remains authoritative.
- `src/app/api/handles/check/route.ts` (GET `?handle=`): returns `{ available, reason? }`
  using `isValidHandle` + `RESERVED_HANDLES` + a DB lookup. Cheap, no auth.
- `src/actions/auth-actions.ts` `signUp`: read + normalize `handle`; validate
  format/reserved; on create set `username`. Distinguish the two unique constraints on
  `P2002` (inspect `error.meta.target`) → redirect `?error=HandleTaken` vs `EmailTaken`;
  add `?error=InvalidHandle`. Surface the new error copy on the sign-up page.

## Profile page (`src/app/users/[handle]/page.tsx`) + styles

- Server component, **no auth gate**. `getUserProfileByHandle(params.handle)`; `notFound()`
  if null. Render `<main>` with display name, `@handle`, the **stats row**, and the two
  chapter lists as **server-rendered tabs via `?sort=new|likes`** (default `new`) — two
  `<Link>`s, no client state. Each chapter row links to `/stories/[storyId]/chapters/[id]`
  and shows title + likes + views. Empty state when the user has no chapters.
- **Stats use the merged `<Stat>` component** (`src/components/ui/stat.tsx`,
  `src/components/ui/icons.ts` — symbols-over-words, item 16, now on `develop`). Likes/views
  reuse the existing `kind="likes"`/`kind="views"`. For the two new totals, **append
  `chapters` and `stories` kinds to the shared `STAT_KIND_DEFS`** (pick lucide glyphs, e.g.
  `BookOpen` / `Library`, nouns "chapter"/"story") so the vocabulary stays centralized —
  don't hand-roll one-off icon+number markup. Per-chapter-row counts use `<Stat>` too.

## Entry-point bylines (each a `<Link href={`/users/${username}`}>`)

- **Story cover** (`src/app/stories/[storyId]/page.tsx` + `getStoryOverview` in
  `stories.ts`): include `author.username`; wrap the existing "by {authorName}" in a link.
  Guard `username == null` → render plain text (no link).
- **Feed** (`src/components/feed/feed-list.tsx` + its query): add `author { displayName,
  username }` to `FeedItem`; render a "by {name}" byline per card, linked.
- **Reader** (`src/components/chapters/chapter-reader.tsx` + page +
  `getChapterWithChoices`): include `author { displayName, username }`; add a byline under
  the `<h1>` linking to the profile. Keep the landmark-scoped-query convention in mind so
  e2e stays unambiguous (don't duplicate an accessible name + destination).

## Seed + test factory (both must set the now-required `username`)

- **`prisma/seed.ts`:** the demo authors (Maya Quill, Theo Vance) and the Admin user now need
  a `username` (the column is required). Set it via `slugifyHandle(displayName)` →
  `maya-quill`, `theo-vance`, `admin`. (`admin` is reserved for sign-up but seeding it
  directly is fine — reserved-words only gate user-chosen handles.)
- **`src/test/factories.ts`:** `createUser` must set a **unique `username`** (e.g.
  `slug + counter/Math.random`) so factory-made users have valid profiles for unit/e2e.

## Tests — strictly test-first

1. **Unit** (`tests/unit/handles.test.ts`): `slugifyHandle`, `isValidHandle` (valid/invalid
   incl. reserved), `generateUniqueHandle` collision behavior.
2. **Unit** (`src/lib/users.test.ts` or `tests/unit/users.test.ts`):
   `getUserProfileByHandle` — stats correct, both sort orders correct, soft-deleted chapters
   excluded, unknown handle → null. Use factories.
3. **e2e** (`tests/e2e/profiles.spec.ts`): sign up with a unique handle → visit
   `/users/<handle>` → see display name, stats, and a just-published chapter in *Newest*;
   switch to *Most liked*; click the **story-cover byline** and land on the profile.
   Cover the **HandleTaken** path (second sign-up reusing the handle shows the error) and a
   **reserved/invalid** handle rejection.
4. **Client** (jsdom, optional but nice): the handle field shows ✓/✗ from a mocked
   availability response.

## ⚠ Required follow-on: fix existing sign-up e2e (or the gate goes red)

Adding a **required Handle field** breaks every spec that signs up. Update each to fill a
unique handle (reuse the spec's `stamp`): **auth, reading, chapter-creation, reporting,
tagging, views-reads, story-cover, full-journey, back-to-parent**. Mechanical — add
`await page.getByLabel('Handle').fill(`<name>-${stamp}`)` to each sign-up block. Confirm the
whole e2e suite is green, not just the new spec.

## Verification

- After the schema edit, `npx prisma migrate dev --name add_user_username` (commit the
  migration) and `npm run db:reset` rebuild a seeded dev db with handles on every user.
- `npm test` fully green (lint → typecheck → unit → e2e). New tests fail before, pass after.
  Note the test harness applies migrations via `migrate deploy`, so the new migration must be
  committed for the suite to see the `username` column.
- Manually: `/users/<handle>` renders for a seeded user (e.g. `/users/maya-quill`); stats use
  `<Stat>` glyphs; the bylines link author names to their profiles.

## Review

_(fill in after implementation)_
