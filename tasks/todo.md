# Feature: Tagging system (foundation)  — backlog idea #3

**Branch:** `feat/tagging-system` (off `develop`). Merge to `develop` only after user approval
(reset this file to the placeholder on the branch *before* merging — see `CLAUDE.md`).
**Plan author:** Opus. **Implementer:** Sonnet, strictly test-first. Gate: `npm test` green.
**Note:** Do NOT start `dev:phone` — the orchestrator (main session) handles the phone
preview after green (see `CLAUDE.md` → "Development loop").

## Why this first

One of the two parallel keystones. Tagging unblocks richer choice cards, feed enrichment,
search, the tag blacklist, and story tag inheritance. This branch builds the **foundation
only** — store/add/remove/display tags + query helpers. The *consumers* (choice cards, feed,
search, blacklist) are separate later waves and are **out of scope** here.

## Decisions carried from the backlog (idea #3, Q4)

- **Curated + free-form.** A curated/official vocabulary (flagged, each with a lucide glyph)
  *plus* writer-invented custom tags (plain text chips).
- **Who can tag = per-story setting; default = crowd** (any signed-in user adds/removes).
  Author can switch the story to `author`-only. (We scope the setting to **per-story** now;
  per-chapter override can come with the collaboration feature, idea #8.)
- **Removal guard (anti tag-war):** in `crowd` mode anyone signed-in may *add*; **removal is
  limited to the chapter's author + admins.** In `author` mode only the chapter author adds.
- **Tags live on chapters; stories inherit top-K** most-common chapter tags (K=5).
- **Normalization:** lowercase, trim, collapse internal whitespace, allow `[a-z0-9 -]`,
  length 1–30, reject empty/duplicate. Custom tags are `isOfficial=false`.

## Out of scope (fast-follows — note, don't build)

- Tag rendering on choice cards / feed / search (those waves consume `getChapterTags` /
  `getStoryTopTags`). - Editing `tagPermission` after creation (set at story creation now).
- Tag *reporting/moderation* beyond author/admin removal (extend the existing report flow later).
- The `<Stat>`/icon component from the symbols-over-words branch — render official-tag glyphs
  with a minimal local mapping for now; swap to the shared component when it lands.

---

## Data model — `prisma/schema.prisma` (then `npx prisma db push`)

```prisma
model Tag {
  id         String       @id @default(cuid())
  name       String       @unique          // normalized, lowercased
  isOfficial Boolean      @default(false)
  icon       String?                        // lucide icon name, official tags only
  createdAt  DateTime     @default(now())
  chapters   ChapterTag[]
}

model ChapterTag {
  id            String   @id @default(cuid())
  chapterId     String
  tagId         String
  addedByUserId String
  createdAt     DateTime @default(now())
  chapter       Chapter  @relation(fields: [chapterId], references: [id])
  tag           Tag      @relation(fields: [tagId], references: [id])
  addedBy       User     @relation(fields: [addedByUserId], references: [id])
  @@unique([chapterId, tagId])             // a tag appears once per chapter
}
```
- Add `tags ChapterTag[]` back-relations to `Chapter` and `User`.
- Add `tagPermission String @default("crowd")` to `Story` (`"crowd" | "author"`).

## Domain helper — `src/lib/tags.ts`

- `normalizeTagName(raw): string` — the rules above; throws a domain error on invalid.
- `addTagToChapter({ chapterId, name, userId })` — load chapter (+ story.tagPermission +
  authorId); enforce permission (crowd → any signed-in; author → must be chapter author);
  find-or-create `Tag` by normalized name (new = custom); create `ChapterTag`; translate
  `P2002` to a domain "already tagged" (idempotent-ish, not an error leak).
- `removeTagFromChapter({ chapterId, tagId, userId })` — allow only chapter author or admin;
  else domain error.
- `getChapterTags(chapterId)` — tags for a chapter (official first, then alpha), `deletedAt`
  filtering not needed on tags but skip tags of soft-deleted chapters in aggregates.
- `getStoryTopTags(storyId, k = 5)` — aggregate count of tags across the story's **non-deleted**
  chapters, return top-K by count (tiebreak alpha).
- `suggestTags(prefix, limit)` — existing tags matching a prefix, official first (autocomplete).

## Curated tag seed — `prisma/seed.ts` (extend existing seed)

Seed a small official set with icons, e.g. `horror→Skull`, `romance→Heart`,
`mystery→Search`, `comedy→Laugh`, `fantasy→Wand`, `sci-fi→Rocket`. Idempotent upsert by name.

## Server actions — `src/lib/tag-actions.ts`

`addChapterTagAction` / `removeChapterTagAction` — auth-guarded (`src/lib/auth.ts` session),
call the helpers, `revalidatePath` the chapter/story. Mirror the existing `*-actions.ts` style.

## UI

- **Tag display + add control** — a `'use client'` component on the chapter reader: renders
  official tags with their lucide glyph + label, custom tags as text chips; signed-in users
  see an add-tag input with `suggestTags` autocomplete (hidden/disabled per permission);
  author/admin see a remove (×) on each tag. Keep accessible names (`getByRole`).
- **Story creation form** (`src/app/stories/new/`) — add a "Who can tag chapters?" choice
  (Anyone / Only me), default Anyone → persists `tagPermission`.

## Tests (write first, watch fail, implement, watch pass)

- **Unit (node)** `tests/unit/tags.test.ts` — normalization (valid/invalid cases); add in
  crowd vs author mode (permission enforcement + non-author rejection); duplicate add →
  domain "already tagged" not P2002 leak; removal author/admin allowed, others rejected;
  `getStoryTopTags` top-K + tiebreak over multiple chapters incl. a soft-deleted one excluded.
  Use `src/test/factories.ts` (extend with a `createTag`/tagging helper if useful).
- **Client (jsdom)** `src/components/chapters/chapter-tags.test.tsx` — renders official glyph
  vs custom chip; add input shows for permitted user, hidden otherwise; remove control only
  for author. (`// @vitest-environment jsdom` docblock.)
- **E2e** `tests/e2e/tagging.spec.ts` — sign up, create a story (crowd mode), add a tag to a
  chapter, see it render; a second user adds another tag (crowd allows); switch a story to
  author-only and confirm a non-author cannot add; official tag shows its glyph. Unique
  `stamp` per the repo convention; scope queries to `main`.

## Step — gate, then report

```bash
npx prisma db push && npx prisma generate   # apply schema locally
npm test                                     # lint → typecheck → unit → e2e (fail-fast)
```
Commit on the branch with a clear message. **Do NOT merge to `develop`, do NOT start
`dev:phone`** — report green; the orchestrator launches the preview and seeks approval.

## File checklist

**New:** `src/lib/tags.ts`, `src/lib/tag-actions.ts`,
`src/components/chapters/chapter-tags.tsx` (+ `.module.css`, + `.test.tsx`),
`tests/unit/tags.test.ts`, `tests/e2e/tagging.spec.ts`.
**Modified:** `prisma/schema.prisma`, `prisma/seed.ts`, `src/test/factories.ts` (tag factory),
`src/components/chapters/chapter-reader.tsx` (mount tag display), `src/app/stories/new/*`
(tagPermission choice), `src/lib/stories.ts` (include `tagPermission` where the story is loaded).

## Review (fill in after implementation)

_(empty)_
