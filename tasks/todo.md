# Feature: Richer choice cards (backlog idea 5)

Surface more per-chapter signal in the **option-select** cards (the reader's child-choice
list). Today each choice card shows only **title + ♥likes + read-dimming**. Add, per the
"symbols over words" convention, the data that now exists:

- **🏷 tags** of the destination chapter (official-first; official = glyph, custom = chip)
- **👁 view count** (`Stat kind="views"`) — `Chapter.viewCount` already exists
- **⑂ descendant count** (`Stat kind="descendants"`, GitFork) — number of nested children
  of that choice (the only genuinely new data; needs a recursive query)

Strictly test-first. Stop and re-plan if anything diverges.

## Design decisions

- **Descendant count = all non-deleted nested children** of a choice (its whole subtree,
  excluding itself). Soft-deleted chapters (`deletedAt != null`) don't count. Links aren't a
  feature yet, so "descendant" == authored `parentChapterId` tree only.
- **Stats always render** (incl. zero) for uniform scannability — a leaf showing `⑂0`
  legitimately reads as "unwritten branch / dead end", matching how ♥0 already always shows.
  Order on the card: ♥likes · 👁views · ⑂descendants (mirrors the reader header's order).
- **Tags are read-only here** — no add/remove affordance in the choice card (that lives in
  the reader). Official tags render as their glyph (icon) with an `aria-label`/`title` of the
  tag name; custom tags render as a small text chip. Cap at **4** shown (official-first sort),
  with a `+N` overflow indicator when a choice has more — keeps cards from bloating.
- Reuse the shared `<Stat>` component (non-`explain`, since stats sit in a card whose title is
  a `<Link>` — `explain` buttons are disallowed inside/around links and `<Stat>`'s own doc
  says so). `<Stat>` already carries the accessible name ("3 continuations" etc.).

## Data plumbing

1. **`getDescendantCounts(chapterIds: string[]): Promise<Map<string, number>>`** in
   `src/lib/chapters.ts`. One recursive CTE via `db.$queryRaw` (SQLite `WITH RECURSIVE`),
   seeding each id as its own `rootId`, walking `parentChapterId` with `deletedAt IS NULL`,
   then `GROUP BY rootId` and `COUNT(*) - 1` (drop the seed self-row). Empty input → empty Map.
   Use `Prisma.join` for the `IN (...)` list; ids missing from the result default to `0`.
2. **`getChaptersTags(chapterIds: string[]): Promise<Map<string, ChapterTagView[]>>`** in
   `src/lib/tags.ts` — batched sibling of `getChapterTags`, same official-first→alpha sort,
   returns one entry per requested id (empty array when untagged). Avoids N+1 over choices.
3. **`getChapterWithChoices`** (`src/lib/chapters.ts`): the child `include` already returns
   `viewCount` (a scalar) and `_count.likes`. No change needed there for likes/views.
4. **Chapter page** (`src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`): after
   computing `choiceIds`, also fetch `getDescendantCounts(choiceIds)` and
   `getChaptersTags(choiceIds)`, then extend each mapped choice with `viewCount`,
   `descendantCount` (Map lookup, default 0), and `tags` (Map lookup, default []).

## Component changes

5. **`ChoiceItem` type + `ChoiceList`** (`src/components/chapters/choice-list.tsx`):
   - Extend `ChoiceItem` to `{ id, title, likeCount, viewCount, descendantCount, read, tags }`
     where `tags: { tagId; name; isOfficial; icon }[]`.
   - Render a compact **tags row** (read-only): official → `officialTagIcon(icon)` glyph with
     `aria-label={name}`+`title`; custom → small chip; cap 4 + `+N`.
   - Render the **stats row**: `<Stat kind="likes" /> <Stat kind="views" /> <Stat kind="descendants" />`.
     Keep the existing `sr-only "Read."` prefix when read.
   - Read-dimming behaviour (`useLocalReadIds` + `choice.read`) is unchanged.
6. **Styles** (`chapter-reader.module.css`): add minimal classes for the choice tag chips/row
   and a stats row (flex, gap, muted). Don't restyle the editor's `chapter-tags.module.css`.

## Tests (test-first, in this order)

- **Unit (node)** `tests/unit/descendant-counts.test.ts`: `getDescendantCounts` over a built
  tree via factories — direct + nested children counted, soft-deleted excluded, leaf → 0,
  multiple roots independent, empty input → empty Map, an id with no row → absent/0. Confirm
  it fails before implementing.
- **Unit (node)** `getChaptersTags`: batched shape, official-first order, untagged id → empty array.
- **Client (jsdom)** `src/components/chapters/choice-list.test.tsx`: renders likes/views/
  descendant stats with correct accessible names, renders official glyph + custom chip,
  applies `+N` overflow past 4, still dims a `read` choice (`data-read`).
- **E2e** extend `tests/e2e/reading.spec.ts`: in the option-select, assert a choice card
  exposes the new signals — scope to `main`, assert a `continuation`/`view` accessible name
  (via `getByLabel`) on a choice known to have children/views from the journey.

## Gate

`npm test` green (lint → typecheck → unit → e2e). Then main session exposes via `dev:phone`.

## Review

_(empty)_
