# Feature: reading-UX pass — clickable cards, story cover page, auto-hiding header

**Branch:** `feat/reading-ux` (off `develop`). Merge to `develop` only after user approval.
**Plan author:** Opus. **Implementer:** Sonnet, test-first. Gate: `npm test` green.
**Note:** Do NOT start `dev:phone` — the main session (orchestrator) handles the phone
preview after you report green (see `CLAUDE.md` → "Development loop").

## Context

Three UX improvements to the (already styled, literary/bookish) app:
1. **Whole-card clickable.** In the feed, the choice list, and anywhere we show a card, only
   the title *text* is a link — the rest of the box doesn't navigate. Make the entire card clickable.
2. **Story page is wrong for a branching story.** `/stories/[storyId]` shows a flat,
   creation-ordered chapter list, which is meaningless for a non-linear tree. Replace it with
   a **cover / landing page**: title, author, light stats, and a "Begin the story" button to
   the root chapter (readers then navigate by choices in the reader, which already works).
3. **Auto-hide the header while reading.** The sticky top bar should slide away on scroll-down
   and return on scroll-up (the "headroom" pattern), giving more reading room on phones.

## Hard constraints — don't break behavior/tests

- This is presentation + one page redesign. Keep all landmark elements (`header`/`nav`/`main`/
  `article`), heading levels, and **accessible names**. Tests click links by accessible name
  (`getByRole('link', { name })`) for chapter/choice titles, `Add a chapter`, nav items, etc.
- For #1 use the **stretched-link** pattern (below) so there's still exactly **one real
  `<Link>` per card with the same accessible name** — clickability changes, semantics don't.
- The story page (#2) currently has **no e2e coverage**, so the redesign is free — but add a
  new spec for it (Step 2c).
- Run `npm test`; everything must stay green. Maintain WCAG AA + visible focus states.

---

## Item 1 — Whole-card clickable (stretched-link pattern)

No structural/markup changes beyond minor wrapper class additions — this is CSS. For each
card, make the title link's `::after` cover the whole (positioned) card; lift any *other*
interactive child above the overlay so it stays clickable.

### 1a. Feed cards — `recent-chapter-feed.module.css`
```css
.card { position: relative; }
.cardTitle::after { content: ''; position: absolute; inset: 0; }
/* the secondary "from <story>" link must stay independently clickable */
.from { position: relative; z-index: 1; }
```
(`.card` already has hover lift; add `cursor: pointer` if it reads better.) The `.from` link
keeps its own accessible name (the story title) and remains clickable above the overlay.

### 1b. Choice cards — `chapter-reader.module.css`
```css
.choiceCard { position: relative; }
.choiceTitle::after { content: ''; position: absolute; inset: 0; }
.choiceLikes { position: relative; z-index: 1; } /* keep count selectable/above overlay */
```
No `.tsx` change needed beyond confirming the title `<Link>` carries `.cardTitle`/`.choiceTitle`.

> Story-overview list cards go away in Item 2, so no stretched-link work there.

---

## Item 2 — Story cover / landing page

### 2a. Data — `src/lib/stories.ts`
Replace `getStoryById` (only the story page uses it) with `getStoryOverview(storyId)` that
returns the cover's shape (or `null` if not found):
```ts
// returns: { title, authorName, rootChapterId, chapterCount, endingCount, contributorCount }
```
- Include `author: { select: { displayName: true } }` and the non-deleted `chapters`
  (need `id`, `parentChapterId`, `authorId`).
- `chapterCount` = non-deleted chapters.
- `endingCount` = chapters that are no chapter's parent: build a `Set` of `parentChapterId`s,
  count chapters whose `id` is not in it.
- `contributorCount` = distinct `authorId` across non-deleted chapters.
- `rootChapterId` from the story (scalar).

### 2b. Page — `src/app/stories/[storyId]/page.tsx` + `src/app/stories/story.module.css`
Render a cover inside `<main>`:
- `<h1>{title}</h1>` (keep the title as the page heading — breadcrumbs/"from" links land here).
- A muted stats line (sans font): `by {authorName}` then `{chapterCount} chapter(s) ·
  {endingCount} ending(s) · {contributorCount} writer(s)` (handle singular/plural).
- A prominent **"Begin the story"** primary button-link → `/stories/${storyId}/chapters/${rootChapterId}`.
  If `rootChapterId` is null (shouldn't happen normally), fall back gracefully (e.g. hide the
  button / show "No chapters yet").
- Remove the flat chapter list and its `.list/.item` styles; restyle `story.module.css` for the
  cover (centered-ish column, stats line, begin button using the shared `.btn .btn--primary`).

### 2c. New e2e — `tests/e2e/story-cover.spec.ts`
Sign up, publish a story (root chapter). From the reader, click the breadcrumb
`From <storyTitle>` to reach `/stories/[id]`; assert the cover shows the story title heading
and a `Begin the story` link; click it and assert you land on the root chapter heading.
Use a unique `stamp` (`${Date.now()}-${Math.random().toString(36).slice(2,8)}`) per the repo
convention. Scope queries to `main`.

---

## Item 3 — Auto-hiding header on scroll

### 3a. New client wrapper — `src/components/layout/header-shell.tsx` (`'use client'`) + `header-shell.module.css`
- Wraps `children` (the server `<SiteHeader/>`), owns the sticky positioning + hide/show.
- Scroll logic: listen to `window` scroll (passive), throttle with `requestAnimationFrame`,
  track last scrollY. Hide when scrolling **down** past a small threshold (~64px); show when
  scrolling **up**; always show near the top. Clean up the listener on unmount.
- Render `<div className={`${styles.shell}${hidden ? ' ' + styles.hidden : ''}`}>{children}</div>`.
- CSS:
  ```css
  .shell { position: sticky; top: 0; z-index: 10; transition: transform 0.25s ease; }
  .shell.hidden { transform: translateY(-100%); }
  @media (prefers-reduced-motion: reduce) { .shell { transition: none; } }
  ```
- Optional polish: reveal when focus moves into the header (`:focus-within`) for keyboard users.

### 3b. Wire in `src/app/layout.tsx`
Wrap the header: `<HeaderShell><SiteHeader /></HeaderShell>`. (Server `SiteHeader` passed as
children to the client shell — supported in the App Router.)

### 3c. `src/components/layout/site-header.module.css`
Move the positioning to the shell: remove `position: sticky; top: 0; z-index: 10` from
`.header` (keep its background/border/shadow/visuals). Avoids double-sticky.

---

## Step 4 — Gate, then report for preview + approval

```bash
npm test   # lint → typecheck → unit → e2e (fail-fast)
```
Commit to the branch with a clear message (e.g. "feat: clickable cards, story cover page,
auto-hiding header"). **Do NOT merge to `develop` and do NOT start `dev:phone`** — report
back green and the main session will launch the phone preview and hand it to the user.

---

## File checklist

**New**
- [ ] `src/components/layout/header-shell.tsx` + `header-shell.module.css`
- [ ] `tests/e2e/story-cover.spec.ts`

**Modified**
- [ ] `src/lib/stories.ts` — `getStoryOverview` (replaces `getStoryById`)
- [ ] `src/app/stories/[storyId]/page.tsx` — cover layout
- [ ] `src/app/stories/story.module.css` — cover styles (drop list styles)
- [ ] `src/components/feed/recent-chapter-feed.module.css` — stretched link
- [ ] `src/components/chapters/chapter-reader.module.css` — stretched choice link
- [ ] `src/app/layout.tsx` — wrap header in `HeaderShell`
- [ ] `src/components/layout/site-header.module.css` — move positioning to shell

**Unchanged**
- DOM accessible names / link text; `src/actions/*`, `prisma/schema.prisma`, validation/render.

## Review (fill in after implementation)

**Summary:** Implemented all three items as specified.

1. **Whole-card clickable** — Added `position: relative` + `cursor: pointer` to `.card`
   (feed) and `.choiceCard` (reader), with `::after { inset: 0 }` stretched overlays on
   `.cardTitle` / `.choiceTitle`. Secondary links/text (`.from`, `.choiceLikes`) got
   `position: relative; z-index: 1` to stay clickable/selectable above the overlay. No
   markup changes — only CSS modules touched.

2. **Story cover page** — `getStoryOverview(storyId)` replaces `getStoryById` (its only
   caller) in `src/lib/stories.ts`, returning `title`, `authorName` (via
   `author.displayName`), `rootChapterId`, `chapterCount`, `endingCount` (chapters whose
   `id` isn't anyone's `parentChapterId`), and `contributorCount` (distinct `authorId`).
   Rewrote `src/app/stories/[storyId]/page.tsx` as a cover: `<h1>{title}</h1>`, a muted
   stats line "by {author} · N chapter(s) · N ending(s) · N writer(s)" with
   singular/plural handling, and a `btn btn--primary` "Begin the story" link to the root
   chapter. If `rootChapterId` is null, shows "No chapters yet." instead of the button
   (graceful fallback — not currently reachable since every story has a root chapter, but
   handled per spec). `story.module.css` rewritten — old `.list`/`.item` styles dropped,
   replaced with `.cover`/`.stats`/`.begin`/`.empty`.

3. **Auto-hiding header** — New `src/components/layout/header-shell.tsx` ('use client')
   wraps `<SiteHeader/>` as `children`, tracks `window.scrollY` via a passive,
   rAF-throttled scroll listener. Hides on scroll-down past 64px, shows on scroll-up, and
   always shows when `scrollY <= 64`. Listener cleaned up on unmount.
   `header-shell.module.css` gives `.shell` `position: sticky; top: 0; z-index: 10` +
   `transition: transform 0.25s ease`, `.hidden { transform: translateY(-100%) }`, a
   `prefers-reduced-motion: reduce` guard (`transition: none`), and an added
   `:focus-within { transform: translateY(0) }` so keyboard focus inside the header always
   reveals it (the "optional polish" from the spec). Wired
   `<HeaderShell><SiteHeader/></HeaderShell>` in `src/app/layout.tsx`. Removed
   `position: sticky; top: 0; z-index: 10` from `.header` in `site-header.module.css`,
   keeping its background/border/shadow.

**New e2e** — `tests/e2e/story-cover.spec.ts`: signs up, publishes a story, follows the
reader breadcrumb `From <storyTitle>` to `/stories/[id]`, asserts the cover heading and
"Begin the story" link (scoped to `main`), clicks it, and asserts landing on the root
chapter heading. Uses the `${Date.now()}-${Math.random().toString(36).slice(2,8)}` stamp
per convention.

**Deviations:** None from the spec's shape/wording — stats line, 64px threshold, and
reduced-motion handling all match the spec as written verbatim.

**Edge cases:** Null `rootChapterId` is handled (renders "No chapters yet." instead of the
"Begin the story" button) though not currently exercised by any story in practice, since
`createStoryWithRootChapter` always sets it.

**Gate result:** `npm test` fully green — lint clean, typecheck clean, unit 18/18 (6
files), e2e 8/8 (including the new story-cover spec). One transient failure was observed
on the first parallel e2e run (`reading.spec.ts` strict-mode collision with another spec's
substring-matching title under `Date.now()`-only stamps, a pre-existing flake unrelated to
this branch's changes); a rerun was fully green and `reading.spec.ts` passes in isolation.
Nothing could not be verified — `dev:phone` was intentionally not started per instructions.
