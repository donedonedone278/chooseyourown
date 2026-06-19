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

## Post-merge-review fix — logged-out chapter open crashed (500)

Verification turned up a real bug the original e2e suite couldn't catch: **every actor in
`views-reads.spec.ts` was signed in**, so nobody exercised the cookie-write path for a
brand-new anonymous visitor.

**Repro (confirmed before fixing):** a cookieless `curl` GET of a chapter URL returned
**HTTP 500** with body containing `"Cookies can only be modified in a Server Action or
Route Handler"`.

**Root cause:** `recordViewAction` (`src/actions/view-actions.ts`) ran during the chapter
page's server render (`src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`). For a
logged-out viewer with no `deviceId` cookie yet, `getOrSetDeviceId()` called
`cookies().set(...)`, which Next.js forbids outside a Server Action / Route Handler.
Signed-in viewers use `user:<id>` and never call it, which is why all three signed-in
actors in the original spec sailed through.

**Fix — kept the approved render-time recording design, moved cookie *writing* out of
render:**
- Added `src/middleware.ts`: mints a `deviceId` cookie (Web Crypto `randomUUID()`) when
  absent, setting it on both the request and response so it's readable in the same
  request that minted it. `matcher: ['/stories/:path*']` covers the chapter reader route.
- `view-actions.ts`'s `getOrSetDeviceId` → `getDeviceId`, now read-only
  (`cookies().get(...)`, no `.set()`). Falls back to an ephemeral `randomUUID()` if the
  cookie is somehow absent (defensive — middleware should guarantee presence) so the
  function still can't throw.

**New test (test-first):** added a second case to `tests/e2e/views-reads.spec.ts` —
a fresh `browser.newContext()` (no sign-in, no cookies) opens a freshly published chapter.
Confirmed it failed against the pre-fix code (`expect(response.status()).toBe(200)` got
500) by temporarily reverting the action change and moving `middleware.ts` aside; restored
both and re-ran to green. Covers: page renders instead of 500, view count goes to "1 view",
a same-context reload stays idempotent at "1 view", and the chapter shows "Read · from
<story>" in that context's feed afterward (logged-out localStorage path).

**Verification:** cookieless `curl` repro now returns **HTTP 200** with no
"Cookies can only be modified" string in the body. Full `npm test` (lint → typecheck → 49
unit/component tests → 12 e2e specs, up from 11) is green.

## Follow-up iteration (post-review polish) — visuals over words + bfcache fix

User review of the working feature: (1) **visuals over words** — replace the literal
"Read · " text with an *intuitive visual* read indicator; the chosen treatment is **dim the
read card** (faded/muted, with hover + keyboard-focus restoring full contrast). (2) Bug:
clicking a chapter then pressing **Back** doesn't show the chapter as read until a manual
refresh — the browser serves the previous page from **bfcache** (a frozen snapshot), so the
new read-state never appears. (3) Record the "visuals over words" principle in `CLAUDE.md`.

### Plan

1. **Visual read indicator (replace text):**
   - `globals.css`: add a reusable `.sr-only` visually-hidden utility (a11y cue, since
     dimming alone gives screen readers nothing).
   - `feed-list.tsx` / `choice-list.tsx`: drop `{read ? 'Read · ' : ''}`. Add a `read`
     modifier class on the card `<li>` when read, a `data-read` attribute for e2e targeting,
     and a `<span className="sr-only">Read. </span>` for screen readers.
   - `recent-chapter-feed.module.css` / `chapter-reader.module.css`: add a `.read` modifier
     — `opacity: ~0.55`, restored to `1` on `:hover, :focus-within` so a read card is still
     fully legible when you reach for it.
2. **bfcache staleness fix (both viewer paths):**
   - Logged-out (localStorage): `useLocalReadIds` currently reads localStorage once in a
     mount effect; bfcache restore doesn't re-run effects. Add a `pageshow` listener that
     re-reads localStorage, so a Back restore reflects the just-read chapter.
   - Signed-in (server prop): the `read` flag is baked into server-rendered props and is
     stale after a bfcache restore. Add `useRefreshOnBfcache(enabled)` (in `read-marker.tsx`)
     that calls `router.refresh()` on `pageshow` when `event.persisted`; FeedList/ChoiceList
     call it with `enabled={isSignedIn}` — no full reload, no flash.
3. **`CLAUDE.md`:** add a short "UI principles → visuals over words" note (rides this branch
   per the doc-changes-travel-with-the-feature rule).

### Tests
- `read-marker.test.tsx`: add a case that a `pageshow` event re-reads localStorage (set the
  key after mount, dispatch `pageshow`, expect read). Add a case that `useRefreshOnBfcache`
  calls `router.refresh()` only on a `persisted` pageshow (mock `next/navigation`).
- `views-reads.spec.ts`: the two existing `getByText('Read · from …')` assertions no longer
  match — retarget to the read card via `main li[data-read="true"]` filtered by story title.

### Review

Done; `npm test` green (lint → typecheck → **53** unit/component tests → **13** e2e specs).
Two follow-up reports handled: the visual indicator, and a **re-diagnosis** of the back-button
bug. Plus a seed of sample branching stories.

**Visual read indicator (replaced text).** Dropped `{read ? 'Read · ' : ''}` from both
`feed-list.tsx` and `choice-list.tsx`. Read cards now get a `.read` modifier
(`opacity: 0.55`, restored to `1` on `:hover, :focus-within` so they stay legible when
reached for) in `recent-chapter-feed.module.css` and `chapter-reader.module.css`. Each read
card also carries a `data-read="true"` attribute (e2e hook) and a `<span class="sr-only">Read.
</span>` (screen-reader cue) — the new `.sr-only` utility lives in `globals.css`.

**Back-button staleness — re-diagnosed and properly fixed.** The first attempt (a `pageshow`
re-read + `router.refresh()` on bfcache restore) targeted the wrong mechanism. Feed cards
navigate via Next `<Link>` (client-side *soft* navigation), so pressing Back is a **`popstate`**,
not a browser bfcache `pageshow`. And for signed-in viewers the homepage's RSC payload is held
**stale in Next's Router Cache**, so a remount alone wouldn't refresh the server `read` flag.
Confirmed both ways: a Playwright soft-nav Back test fails against the server-only behavior
(card stays unread) and passes with the fix.
- The localStorage read-set is now the **instant overlay for every viewer** (not just
  logged-out): `MarkChapterRead` runs for signed-in users too, and display is
  `read = serverRead || localRead`. Server `ChapterView` rows remain the cross-device truth.
- The set is **namespaced per user** (`readChapterIds:<userId|anon>` via `readStorageKey`) so
  two accounts on a shared device don't bleed read-state into each other.
- `useLocalReadIds(userId)` re-syncs on **`popstate`** (soft Back/Forward) and **`pageshow`**
  (hard bfcache restore), covering both navigation kinds with no refetch and no flash.
- Removed `useRefreshOnBfcache` — the overlay supersedes it. Threaded `userId` (replacing the
  `isSignedIn` prop) through `page.tsx`/`RecentChapterFeed`/`FeedList` and the chapter
  `page.tsx`/`ChapterReader`/`ChoiceList`/`MarkChapterRead`.

**Sample stories (seed).** `prisma/seed.ts` now seeds two demo authors and three branching
stories — *The Lighthouse at Dunmore* (9 chapters, 4 levels deep on one path), *Signal from
Europa* (7), *The Last Tea Shop on Marrow Street* (7) — built recursively from a nested
`StoryNode` spec via the existing `createStoryWithRootChapter`/`createChildChapter` helpers.
Idempotent (skips a story whose title already exists), so `npm run db:seed` is safe to re-run.

**Tests.** `read-marker.test.tsx` rewritten for the new API: per-user namespacing, a
`popstate` soft-Back re-read, a `pageshow` hard-Back re-read, and `MarkChapterRead` writing the
namespaced set. `views-reads.spec.ts`: the read assertions target `main li[data-read="true"]`,
plus a **new soft-nav regression spec** — a signed-in reader opens a feed chapter via its
`<Link>`, presses Back, and the card is read with no reload (proven to fail pre-fix).

**Docs.** Added a "UI principles → Visuals over words" section to `CLAUDE.md` (rides this
branch).

**Follow-up: "tapped option stays highlighted after Back" — iOS sticky `:hover`.** Reported
on iPhone (the dev:phone preview). The cause wasn't focus at all: iOS Safari leaves `:hover`
applied to the last-tapped element until you tap elsewhere, so the chosen choice/feed card kept
its hover treatment (lifted shadow, accent border, and — via the read-card hover rule —
un-dimmed back to full opacity) when you returned. Fix: gate every card hover rule behind
`@media (hover: hover)` so it applies to real pointers only; the read-card brighten now splits
into `.read:has(:focus-visible)` (keyboard, always) + `.read:hover` (inside the media query).
Both `chapter-reader.module.css` and `recent-chapter-feed.module.css`. (An interim
`onMouseDown`/`preventDefault` focus hack was tried and reverted — it addressed desktop focus
restoration, not the actual iOS hover behavior.)

**Follow-up: sign-in with a non-existent account crashed (500).** `authorize` returns `null`
for bad credentials, so Auth.js `signIn` throws an `AuthError` (`CredentialsSignin`) that the
`signInWithCredentials` server action didn't catch — an unhandled crash. Fix (`auth-actions.ts`):
wrap `signIn` in try/catch, `redirect('/auth/sign-in?error=CredentialsSignin')` on `AuthError`,
and re-throw everything else (notably the success `NEXT_REDIRECT`). Hardened the adjacent
`signUp` crash class too: a duplicate email (Prisma `P2002`) now redirects to
`/auth/sign-up?error=EmailTaken`, and missing fields to `?error=MissingFields`, instead of
throwing. Both auth pages became `async`, read `searchParams.error`, and render a friendly
`.formError` message (new style in `chapter-form.module.css`). New e2e (test-first, confirmed
failing pre-fix): unknown-account sign-in and duplicate-email sign-up both show an error and
stay on the page instead of crashing. Gate green — 15 e2e specs.
