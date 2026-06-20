# Plan: Back-to-parent navigation button (backlog item 13)

Branch: `feat/back-to-parent`

## Goal

A clear, in-page control on the chapter reader that takes the reader up to the **structural
parent chapter** (`parentChapterId`) — not the chapter they arrived from. (Single-parent
invariant makes this stable; future circle-back links never create parents.)

**Root chapters get no back control** — the existing breadcrumb ("From <story>") already
links to the story cover, so a root-level "back to story" button would just duplicate it.
The control renders **only when `parentChapterId` is set**.

Distinct in-page control, not reliant on browser back. No new query — `getChapterWithChoices`
already returns `parentChapterId` (a scalar on `Chapter`).

## Scope decisions (kept minimal)

- **No parent-title fetch.** Keep it trivial per the backlog sketch — generic, clear copy,
  no extra DB round-trip.
- Copy: `← Back to the previous chapter`. (Only ever points at a parent chapter, so no
  collision with the breadcrumb's story link.)
- a11y: it's a `Link` with visible text, so the accessible name covers screen readers. Add a
  `data-testid="back-to-parent"` hook for a stable e2e assertion.
- Symbols-over-words infra (item 16) isn't built yet; use a plain `←` glyph in the label now.
  When the `<Stat>`/icon vocabulary lands, this control can adopt a lucide icon.

## Implementation (strictly test-first)

1. **e2e spec** `tests/e2e/back-to-parent.spec.ts` (write first, watch it fail):
   - Sign up; publish a story (root) + one child chapter under the root (reuse the
     `reading.spec.ts` pattern + the `Date.now()`-plus-random stamp convention).
   - On the **child** reader: `back-to-parent` control is visible; clicking it lands on the
     **root** chapter heading.
   - On the **root** reader (`page.goto(rootUrl)`): the `back-to-parent` control is **not**
     present (root has no parent).
   - Scope queries to `main` per the landmark convention.
2. **`ChapterReader`** (`src/components/chapters/chapter-reader.tsx`):
   - Add prop `parentChapterId: string | null`.
   - When `parentChapterId` is set, render the back `Link` near the top of the `<article>`
     (with the breadcrumb), `data-testid="back-to-parent"`,
     `href={/stories/${storyId}/chapters/${parentChapterId}}`, label `← Back to the previous chapter`.
     When null, render nothing.
   - Style hook in `chapter-reader.module.css` (e.g. `.backLink`) — quiet, secondary weight.
3. **Reader page** (`src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`):
   - Pass `parentChapterId={chapter.parentChapterId}` to `ChapterReader`.

## Verification

- `npm test` green (lint → typecheck → unit → e2e).
- New e2e spec fails before the component change, passes after.

## Review

_(fill in after implementation)_
