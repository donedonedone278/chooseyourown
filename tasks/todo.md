# Feature: Options-as-edges (choice label ≠ title + author-suggested prompts)

Branch: `feat/ls-options-as-edges`. Combines backlog idea 4 (choice label distinct from
chapter title) + idea 9 (author-suggested prompts) — one mechanism, a new `ChapterOption`
edge between parent and child that carries the label and may exist before its destination
chapter does. `Chapter.parentChapterId` stays the authoritative tree (descendant counts +
back-to-parent unchanged); the edge is an overlay.

**Decisions (user, 2026-06-20):** full mechanism this branch · choice **label required**,
chapter **title optional & defaults to the label** · only the **parent chapter's author**
seeds unclaimed prompts · unclaimed prompts **visible to everyone** as a "✎ write this" slot.

**Invariant:** every non-root, non-deleted chapter has exactly one *incoming realized* option
(`childChapterId = chapter.id`); root chapters have none. A chapter's option-select = its
outgoing options ordered by `createdAt ASC` (realized = has child; unclaimed prompt = null).

Strictly **test-first**: write the failing test, confirm it fails, implement, confirm green.

## Plan

### 1. Data model + migration
- [ ] Add `ChapterOption` to `prisma/schema.prisma`: `id`, `parentChapterId`,
      `childChapterId String? @unique` (null = unclaimed prompt), `label`, `createdByUserId`,
      `createdAt`. Relations: `parentChapter` (`"ChapterOptionsFromParent"`), `childChapter?`
      (`"ChapterOptionToChild"`), `createdBy`. Back-relations on `Chapter`
      (`optionsFromHere[]`, `incomingOption?`) and `User` (`optionsCreated[]`). No `storyId`.
- [ ] `npx prisma migrate dev --name chapter-options`. Hand-append a backfill INSERT after the
      generated `CREATE TABLE` — one realized option per non-root chapter
      (`id = 'opt-' || Chapter.id`, label = title, child = id, createdAt/createdBy from chapter).
      Commit the migration.

### 2. Domain helpers — `src/lib/chapters.ts`
- [ ] Shared `MAX_OPTION_LABEL = 120`; trim + length-validate labels.
- [ ] `createChildChapter({ storyId, parentChapterId, authorId, label, title?, content,
      optionId? })` in one `$transaction`: `finalTitle = title?.trim() || label`; validate
      parent (existing checks). Open-branch ⇒ create chapter then realized option. Claim
      (`optionId`) ⇒ create chapter then guarded
      `updateMany({ where: { id: optionId, childChapterId: null, parentChapterId }, data: { childChapterId } })`;
      `count === 0` ⇒ throw `'prompt already claimed'`.
- [ ] `addSuggestedPrompt({ parentChapterId, authorId, label })` → unclaimed option.
- [ ] `deleteSuggestedPrompt({ optionId, userId })` → delete only if unclaimed AND caller owns
      the parent; else throw.
- [ ] `getChapterWithChoices` → include `optionsFromHere` (orderBy createdAt asc) with
      `childChapter` (`_count.likes`, `viewCount`, `deletedAt`). Drop realized options whose
      child is soft-deleted; keep unclaimed prompts.

### 3. Server actions — `src/actions/chapter-actions.ts`
- [ ] `createChildChapterAction` reads `label` (required), optional `title`, optional `option`.
      If `option` present: verify unclaimed prompt on this parent, use its label. Keep
      `revalidatePath('/')` + parent + `redirect` to child. Friendly `'prompt already claimed'`.
- [ ] `addSuggestedPromptAction(storyId, parentChapterId, formData)` — `requireUser`, **403
      unless viewer === parent author**, create prompt, revalidate parent page.
- [ ] `deleteSuggestedPromptAction(storyId, parentChapterId, optionId)` — guarded delete +
      revalidate.

### 4. UI
- [ ] `…/[chapterId]/page.tsx` — map `optionsFromHere` to choice items
      `{ optionId, kind: 'realized'|'prompt', label, … }`. Realized keeps existing enrichment
      (likes/views/descendants/read/tags) keyed by child id; prompts carry only label. Pass
      `isAuthor`.
- [ ] `choice-list.tsx` (+ `ChoiceItem`) — primary text = **label**. Realized → child link,
      keep stats/tags/read-dimming. Prompt → muted card, ✎ glyph, accessible name
      ("Unwritten — write this chapter"), `data-kind="prompt"`, links to `…/new?option=<id>`,
      no stats.
- [ ] `chapter-reader.tsx` — when `isAuthor`: add-suggested-prompt form (label input +
      `addSuggestedPromptAction`) and a × delete on each owned unclaimed prompt.
- [ ] `…/[chapterId]/new/page.tsx` — read `searchParams.option`; if present load it,
      404/redirect if missing/claimed/wrong parent, pass label as fixed/read-only.
- [ ] `chapter-form.tsx` — child mode: **Choice label** field (required, editable open-branch;
      read-only `fixedLabel` when claiming), **title optional** (placeholder "defaults to the
      choice label"). Story-start mode unchanged (title required, no label).

### 5. Test data
- [ ] `src/test/factories.ts` — `createChapter` with a `parentChapterId` also creates the
      realized option (label = title). Add `createChapterOption(...)`.
- [ ] `prisma/seed.ts` + `prisma/seed-test-data.ts` — create options with child chapters
      (some labels distinct from titles) + a couple of unclaimed prompts for the preview db.

### 6. Tests (test-first)
- [ ] Unit `tests/unit/chapter-options.test.ts` + update `tests/unit/chapters.test.ts` to the
      new signature: open-branch (title falls back to label) · addSuggestedPrompt · claim sets
      child + inherits label + second claim throws · `getChapterWithChoices` returns realized
      + unclaimed in order, drops soft-deleted child's option · deleteSuggestedPrompt removes
      unclaimed / refuses claimed / refuses non-owner.
- [ ] Client `choice-list.test.tsx` — renders label not title; prompt card has correct
      `?option=` href + no stats; realized card keeps stats.
- [ ] E2e `tests/e2e/options-as-edges.spec.ts` — author adds prompt → appears as unwritten →
      second writer claims + writes → label persists, slot closed, chapter shows its own
      title; plus open-branch label ≠ title. Stamped unique inputs + landmark-scoped locators.
- [ ] `npm test` green.

## Review

_(to be filled after implementation — note deferred follow-ups: label edit after claim,
per-parent option caps, editing unclaimed-prompt text.)_
