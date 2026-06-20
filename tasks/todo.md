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

## Schema (`prisma/schema.prisma`)

- Add `username String? @unique` to `User`. **Nullable on purpose:** the repo uses
  `prisma db push` (not migrations), and a required+unique column can't be pushed onto a
  table that already has rows (every existing row would need a distinct value, and a
  `@default` can't be unique). So: nullable column + app-level invariant that it's always set
  (sign-up sets it; backfill fills existing rows). The profile route treats a missing handle
  as a 404.
- Backfill: `prisma/backfill-usernames.ts` (+ `npm run db:backfill-usernames`) — idempotent;
  for every user with `username == null`, generate a unique handle from `displayName`
  (slugify + `-2/-3` on collision) and save. Run once locally after `prisma db push`.

## Handle utilities (`src/lib/handles.ts`) — pure, unit-tested

- `slugifyHandle(displayName): string` — lowercase, spaces/underscores→`-`, strip to
  `[a-z0-9-]`, collapse/trim hyphens.
- `isValidHandle(handle): boolean` — `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$` (3–30 chars,
  no leading/trailing/double hyphen), lowercase only.
- `RESERVED_HANDLES` set — `admin, api, auth, users, stories, new, sign-in, sign-up, about,
  settings, me, null, undefined` — rejected even if well-formed.
- `generateUniqueHandle(base, exists)` helper used by both sign-up fallback and backfill.

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
  if null. Render `<main>` with display name, `@handle`, the stats row (plain
  text/number for now — the symbols-over-words `<Stat>` infra, item 16, is a separate
  in-flight branch; don't depend on it), and the two chapter lists as **server-rendered
  tabs via `?sort=new|likes`** (default `new`) — two `<Link>`s, no client state. Each
  chapter row links to `/stories/[storyId]/chapters/[id]` and shows title + likes + views.
  Empty state when the user has no chapters.

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

## Test factory (`src/test/factories.ts`)

- `createUser` must set a **unique `username`** (e.g. slug + counter/`Math.random`) so
  factory-made users have valid profiles for unit/e2e.

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

- `npm test` fully green (lint → typecheck → unit → e2e). New tests fail before, pass after.
- Manually: `prisma db push` then `npm run db:backfill-usernames` leaves every existing user
  with a handle; `/users/<handle>` renders for a seeded user.

## Review

_(fill in after implementation)_
