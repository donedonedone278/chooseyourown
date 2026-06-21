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

---

# Follow-up (same branch): clean seed split + e2e db isolation

**Why now (decisions confirmed with user 2026-06-21):** the "tiny stories" in the phone
preview are **e2e pollution**, not seed data — Playwright runs against the shared `dev.db`
(stamped `Feed Story …`, `Riley Story …`, etc. accumulate and never clear). Fix the root
cause *and* clean up the seed scripts into a proper setup/dev-data split.

**Confirmed decisions:**
- **e2e isolation:** point Playwright at its **own db + own port** so `npm test` never
  touches `dev.db`; the preview db is exactly what the seed produced.
- **Seed split:** `seed.ts` = **setup only** (official tags; no users/stories/chapters).
  dev-data seed = **all** users + stories. `npm run db:reset` runs **both** so the preview
  is still fully populated by one command.
- **Story set:** keep **all 5 bigger stories** (3 demo + 2 deep). Give the 2 deep stories
  distinct choice-labels + suggested prompts so they demo options-as-edges too.

## Plan

### A. e2e gets its own db + port (de-pollute the preview)
- [ ] `playwright.config.ts`: `baseURL`/`webServer.url` → `http://127.0.0.1:3100`;
      `webServer.command` adds `--port 3100`; `webServer.env = { DATABASE_URL: 'file:./e2e.db' }`;
      `reuseExistingServer: false` (each run gets a fresh server on the freshly-built e2e db,
      and a running `dev:phone` on :3000 is never reused/clobbered).
- [ ] `scripts/test-e2e.sh` (new): export `DATABASE_URL=file:./e2e.db`, source `.env` for
      `AUTH_SECRET`, `rm -f prisma/e2e.db*`, `prisma migrate deploy`, run **setup seed** then
      **dev seed** against e2e.db, then `exec playwright test "$@"` (args pass through so
      single-spec runs still work). `package.json` `test:e2e` → `bash scripts/test-e2e.sh`.
- [ ] Confirm `tests/e2e/global-setup.ts` still scrapes a chapter/user from the (now seeded)
      e2e feed to warm dynamic routes — no code change expected; verify the cold-start fix
      still holds. `.gitignore` already covers `*.db` (so `e2e.db` is ignored).

### B. `prisma/seed.ts` → setup-only
- [ ] Strip everything except the official-tag vocabulary upsert: remove admin/authors/readers,
      `DEMO_*`, `TAGS_BY_TITLE`, `makeRng`/`pickSome`/`seedEngagement`/`seedDemoStory`,
      profile-view seeding. Result: `main()` upserts `OFFICIAL_TAGS` only. Stays the
      `prisma db seed` target (run by `db:reset`).

### C. `prisma/seed-test-data.ts` → `prisma/seed-dev.ts` (all dev data, 5 stories)
- [ ] `git mv prisma/seed-test-data.ts prisma/seed-dev.ts`; `git mv scripts/seed-test-data.sh
      scripts/seed-dev.sh` (point it at `prisma/seed-dev.ts`); `package.json`
      `db:seed:test` → `db:seed:dev` → `bash scripts/seed-dev.sh`.
- [ ] Unify on **one** story/node model + **one** enrichment path (drop the two parallel
      systems). Node carries `title`, `content`, optional `label` (≠ title), optional
      `prompts[]`, optional `tags[]`, `children[]`. One function seeds likes + unique views +
      tags; keep author **profile views**; keep the named **reader/liker** pool; keep the
      short-login accounts (`a@a.co`/`b@b.co`/`c@c.co` admin) **and** an `admin@example.com`.
- [ ] Port the 3 demo stories (Lighthouse, Europa incl. the `author` tag-permission variant,
      Tea Shop) with their labels/prompts/tags into this file, alongside the 2 deep stories
      (Clockwork Orchard, Down the Static). **Add distinct labels + a couple of prompts** to
      the 2 deep stories so all 5 demo label≠title + the ✎ write-this slot. Idempotent
      (skip-if-exists) preserved.

### D. Orchestration + docs
- [ ] `scripts/db-reset.sh`: after `prisma db seed` (setup tags), run the **dev seed**
      (`bash scripts/seed-dev.sh`) so `db:reset` = drop → migrate → setup → dev-data in one
      idempotent step. Update its closing message (accounts now from the dev seed).
- [ ] `README.md`: `prisma db seed` no longer makes an admin — admin/dev data come from
      `db:reset` (or `db:seed:dev`). Fix the two stale lines.
- [ ] `CLAUDE.md`: the feature-demo seed is now `prisma/seed-dev.ts` (still built into the
      preview via `db:reset`, which runs both seeds); `seed.ts` is setup-only. Update the
      "update the committed seed script" line, the Commands list (`db:seed:dev`), and the
      single-spec e2e instruction (`npm run test:e2e -- tests/e2e/<spec>` now that e2e builds
      its own db). Note e2e's dedicated db/port. (Doc changes ride this branch.)
- [ ] `scripts/README.md`: reflect `seed-dev.sh`, db:reset running both seeds, and the e2e
      db/port isolation + `test-e2e.sh`.
- [ ] `tasks/lessons.md`: record the root-cause lesson (browser-suite must not share the
      dev/preview db; isolate by db **and** port so a live preview can't be reused/clobbered).

### E. Verify
- [ ] `npm run db:reset`, then query: exactly **5** stories, ≥1 chapter with `label ≠ title`,
      ≥1 unclaimed prompt, believable like/view counts, official tags present. No stamped
      `… Story <digits>` rows.
- [ ] `npm test` green (e2e now against `e2e.db` on :3100; `dev.db` untouched — re-query
      `dev.db` after the run to prove zero new stories appeared).
- [ ] Main session `db:reset` + relaunch `dev:phone`; hand over the clean preview.

## Review (follow-up)

**Done & verified.**
- **e2e isolation:** `playwright.config.ts` → port :3100 + `webServer.env DATABASE_URL=file:./e2e.db`
  + `reuseExistingServer:false`. New `scripts/test-e2e.sh` rebuilds `prisma/e2e.db`
  (drop→migrate→setup→dev seed) then runs Playwright; `test:e2e` points at it. `global-setup.ts`
  unchanged (reads baseURL from config) and still warms routes off the seeded e2e feed.
- **Seed split:** `prisma/seed.ts` is now setup-only (official tags). `seed-test-data.ts` →
  `seed-dev.ts` (git mv), unified onto one node model + one engagement path, holding all 5
  stories + all accounts (authors, admin, short logins, reader pool) + profile views. Both deep
  stories got distinct labels + prompts. `scripts/seed-test-data.sh` → `seed-dev.sh`;
  `db:seed:test` → `db:seed:dev`. `db-reset.sh` runs both seeds.
- **Docs:** README, CLAUDE.md, scripts/README.md updated; lessons.md records the root cause.
- **Verification:** `db:reset` → exactly **5 stories** (9/7/7/15/14 ch), **47/47 realized
  options label≠title**, **23 prompts**, 0 stamped rows. `npm run check` green. After the gate,
  `dev.db` still 5 stories / 0 stamped (untouched); the 14 stamped test rows landed in the
  isolated `e2e.db`. Preview relaunched on the clean db.

_Deferred/none: Prisma 6→7 upgrade warning is pre-existing and out of scope._
