# Feature backlog

The idea pool for ChooseYourOwn — capture freely now, refine later. This is the durable
wishlist; it is **not** an active plan. When an idea is ready to build, it graduates to a
feature branch and its execution plan goes in that branch's `tasks/todo.md`
(see `CLAUDE.md` → "Branches and workflow").

## How we use this file

- **One `##` section per idea.** Append new ideas at the **bottom** (two contributors —
  appending avoids merge conflicts, same as `tasks/lessons.md`).
- Each idea carries a **Status**: `raw` (just splatted) → `refining` (questions in flight)
  → `ready` (refined enough to branch and plan).
- Keep the original splat verbatim under **The idea** — don't lose the raw thought.
  Clarifying questions and answers accumulate under **Open questions**.
- When an idea graduates to a branch, mark it `shipped`/`in progress` and link the branch,
  rather than deleting it — the trail is useful.

### Per-idea template

```
## <short title>  — _status: raw_
**The idea:** <verbatim splat>
**Why / value:** <who it helps and why it matters — fill in during refining>
**Open questions:** <clarifications to resolve before this is `ready`>
**Sketch / notes:** <data model, UI, edge cases, dependencies — optional, grows over time>
```

---

<!-- Splat ideas below this line. -->

## User profiles  — _status: refining_
**The idea:** "I want to have user profiles. There should be the ability to look at a
user's chapters chronologically and also sorted by number of likes."
**Why / value:** _(refine)_
**Decided (Q9, 2026-06-16):**
- **Public to everyone**, including logged-out (server-rendered read surface).
- Contents: the two **chapter lists** (chronological + by likes), a **bio**, **aggregate
  stats** (total likes/views, # stories started, # chapters contributed), **follower /
  following counts**, and the user's **liked stories** — the last **gated by a per-user
  "show likes" setting** (see new "User settings / privacy" entry).
- **No avatar for now** (not selected → avoids adding file upload/storage).
**Open questions:** "liked stories" vs liked *chapters* — likes today are per-chapter
(`ChapterLike`); does the profile list liked chapters, or stories containing them? URL shape
(`/users/[name]` vs id); is display name unique/stable enough to route on?
**Sketch / notes:** all derivable from existing data + the new follow/settings tables.

## Chapter view counter  — _status: refining_
**The idea:** "There should be a view counter for chapters."
**Why / value:** _(refine)_
**Decided (F3, 2026-06-16):**
- A **view = unique viewer**, counting **logged-out readers too** (distinct signed-in users
  + distinct anonymous devices; anonymous uniqueness is approximate).
- **Viewed and read are the same event** — opening a chapter both marks it read and records
  a unique view (see "Read / visited indicators"). One signal drives both.
**Open questions:** exclude the **author's own** views from their chapter's count? (likely
yes). How is an anonymous device identified — cookie/localStorage id? Retention of raw
view rows vs. a denormalized count.
**Sketch / notes:** unique counting implies per-(viewer, chapter) records, not just an
integer; viewer = account id when signed in, else a device id.

## Chapter tagging system  — _status: refining_
**The idea:** "Chapters should have a tagging system." Tags surface in several places —
see "Richer choice cards", "Home feed enrichment", and "Search".
**Why / value:** _(refine)_
**Decided (Q4, 2026-06-16):**
- **Curated + free-form:** a curated/official core vocabulary *plus* writer-invented custom
  tags. Some **special/official tags get symbols** (icons) — coordinate with the
  "symbols over words" convention and the icon vocabulary chosen there.
- **Who can tag is a per-writer setting; default = crowd-tagging** (any signed-in user can
  add/remove tags). Writer can tighten it (e.g. author-only). Because default is open, tags
  are a **moderation surface** → extend the existing report/remove flow to cover tag abuse.
- Tags are recorded on **chapters**. **Stories inherit their chapters' tags "to an extent"**
  (derived, not separately authored).
**Decided (follow-up):** story inherited tags = **top-K most common** chapter tags (bounded
list regardless of story size; K to be set, e.g. 5). A niche tag on one branch won't surface
at the story level unless it's frequent.
**Open questions:**
- Is the "who can tag" permission a per-**chapter** or per-**story** setting? (ties to the
  collaboration settings, idea 8.)
- Tag normalization (case/whitespace/synonyms); cap per chapter; who curates the official
  set + assigns their symbols (admin?).
**Sketch / notes:** likely a `Tag` table + `ChapterTag` join; official tags flagged + carry
an icon; story tag cloud = aggregate query over its chapters per the inheritance rule.

## Choice label distinct from chapter title  — _status: refining_
**The idea:** "Chapters should have both a title and separate text when in the option
select (like '…climb the stairs' could be the option, but after clicking the actual title
of the chapter might be different)."
**Why / value:** _(refine)_
**Decided (F2, 2026-06-16):** the **option label** lives on the parent→child choice edge,
separate from the child chapter's own **title**. Label text originates **either** from a
parent-authored suggested prompt the child claimed, **or** from the child author's own
wording when they open-branch. See "Author-suggested next-chapter prompts" for the slot
mechanics — these two entries describe one mechanism.
**Open questions:** char limit on labels; can a label be edited after the child is written?
**Sketch / notes:** today choices render the child's *title*; this splits "label" (shown in
the option select) from "title" (shown once you're reading the chapter).

## Richer choice cards (tags + like/view counts + descendant count in the option select)  — _status: refining_
**The idea:** "Tags on chapters should be visible in the option select when choosing the
next chapter to go to." + "The number of likes should be visible in the option select
section along with the tags." + "Another stat of each chapter that should be visible in
option select is the number of children it has (including nested)."
**Why / value:** _(refine)_
**Open questions:** _(pending — "children including nested" = descendant count, a
recursive/aggregate query; how computed/cached?)_
**Sketch / notes:** stats shown here should follow the "symbols over words" convention
(see below). Likely set: ♥ likes · 👁 views · ⑂ descendants · tags.

## Terminal / ending chapters  — _status: refining_
**The idea:** "One day I want to have an option for chapters that the writer can designate
as a terminal point (like an ending)." (Flagged by user as a later/"one day" item.)
**Why / value:** _(refine)_
**Decided (Q6, 2026-06-16):**
- A terminal chapter **always shows an ending badge** (visual marker, regardless).
- **Enforcement is the author's choice:** they can make it *hard* (no children may be added)
  or leave it *soft* (badge only, branching still allowed).
- Two independent fields: `isEnding` (badge) + `endingEnforced` (locks branching).
**Open questions:** does the story-cover **endings count** include soft (badge-only)
endings, or only enforced ones? (lean: count any `isEnding`.) Reversible by author — assume
yes. Interaction with suggested prompts: a hard ending shouldn't accept new prompt slots.
**Sketch / notes:** _(refine)_

## Non-tree connections (circle back / link to existing chapters)  — _status: refining_
**The idea:** "I also would like chapters to be able to circle back to previous chapters
or connect to other chapters."
**Why / value:** _(refine)_
**Decided (F1, 2026-06-16):**
- **Navigation edge only** — a link is a choice that points to an existing chapter; the
  target does NOT gain a second parent. The authored `parent→child` tree stays a strict
  tree (one-parent invariant preserved); links are a *separate layer* on top. New data:
  a chapter→chapter "link" join (distinct from `ChapterChildren`), rendered as choices.
- **Same story only** — links may only target chapters in the same story (keeps per-story
  stats meaningful).
- **Visually distinguished** in the option select (e.g. "↩ back to the tavern") so readers
  know they're revisiting, not entering fresh writing.
**Open questions:** who may add a link (parent author only, or anyone extending?); do
linked targets count toward "descendant count" (probably no — they're not descendants).
**Sketch / notes:** because parentage is untouched, the back button (idea 13) and
descendant count (idea 15) keep operating on the real tree, unaffected by links.

## Story collaboration settings (wiki / suggested edits + version history)  — _status: refining_
**The idea:** "When a user creates a chapter they should be able to designate a few things
about their story. One is that they can allow other users to make edits, like a wiki. Or
they can turn on a setting so people suggest edits and the author can approve or reject.
Previous iterations of chapters should be kept just in case."
**Why / value:** _(refine)_
**Decided (Q5, 2026-06-16):**
- **Edit mode** ∈ {wiki (open edits), suggest-edits (proposals approved), locked}.
  **Scope: per-story default, with per-chapter override** — story owner sets the default;
  individual chapter authors may override for their own chapter.
- **Wiki mode → shared co-authorship:** an edited chapter shows "by <original> &
  contributors" and lists contributors (original creator credited, not erased).
- **Suggest-edits mode → approval by *either* the chapter's author *or* the story owner**
  (first to act wins; need to handle the race / double-decision).
- **Version history: retained AND user-facing** — browse revisions and restore a prior
  version (full wiki-style safety net). Every revision kept with who/when.
**Open questions:**
- This is the **heaviest** item — almost certainly splits into multiple feature branches
  (revision storage model → edit modes → suggest/approve flow → history+restore UI).
- Interplay with **soft-delete** (admin removal) and with **likes/views** on an edited
  chapter (do they persist across revisions? yes — they attach to the chapter, not a rev).
- Where do suggested edits queue + how are pending proposals surfaced/notified? (overlaps
  the follow/notifications question, Q10.)
- Does the per-chapter "who can tag" setting (Q4) live alongside these per-chapter overrides?
- Restoring a revision = new revision (append) vs. true rollback — append is safer.
**Sketch / notes:** new `ChapterRevision` (chapterId, content, editorId, createdAt) with the
live `Chapter.content` = latest revision; `EditProposal` for suggest-mode; a contributors
set per chapter for co-authorship display.

## Author-suggested next-chapter prompts  — _status: refining_
**The idea:** "A chapter writer can leave some suggested options for next chapters and
users can click those and write the next chapter."
**Why / value:** _(refine)_
**Decided (F2, 2026-06-16):**
- Suggested prompts are **optional** and **don't fence** extension: a child author may
  **claim an unclaimed suggested prompt** *or* **add their own new option** (open branching).
- A claimed suggested prompt → **exactly one chapter** (first writer owns it; slot then
  closes). Open-branch options are each their own chapter as today.
- So a parent chapter carries: 0+ *unclaimed* suggested prompts (label only, no chapter
  yet) + the realized child choices (label + destination chapter).
**Open questions:** can the parent author cap how many children/total options exist? Can
they delete/edit an unclaimed prompt? Can the same writer claim multiple prompts on one
parent? Do unclaimed prompts show to readers (as "be the one to write this") or only to
would-be writers?
**Sketch / notes:** data model gains an "option" record on the parent→child edge that may
exist *before* its destination chapter does (unclaimed prompt = option with null child).

## Home feed enrichment + default to recent-popular  — _status: refining_
**The idea:** "Tags and likes for chapters should also be able to be visible on the feed on
the home page." + "The home page feed should show recent popular chapters by default rather
than just a pure feed."
**Why / value:** _(refine)_
**Decided (Q7, 2026-06-16):**
- Default feed = **"hot" score**: a recency-decayed blend of likes + views
  (`score = f(likes, views) / (age + k)^g`, HN/Reddit-style). Fresh *and* resonating rises;
  no hard window.
- **Keep a "Newest" tab** (pure recency) so new chapters/writers aren't buried. Home =
  `[ Popular ] [ Newest ]`, Popular default.
- Feed cards show **tags + like counts** (and per symbols-over-words, as icons), plus
  read/unread marks (F3).
**Open questions:** exact decay constants (k, g) + tuning; is the feed over **chapters** or
also **stories**? cache/refresh strategy for the score (recompute on read vs. periodic).
**Sketch / notes:** hot score needs likes + views per chapter (views from the counter idea)
and chapter age; consider a denormalized/cached score column for cheap ordering.

## Search (tags, titles, etc.)  — _status: refining_
**The idea:** "There should be searching based on tags and titles and etc."
**Why / value:** _(refine)_
**Decided (Q8, 2026-06-16):**
- **Scope: stories + chapters + users/writers** (all three).
- **Full-text from day one:** SQLite **FTS5** over title + tags + chapter **body**, with
  relevance ranking (bm25). Users searchable by name (feeds follow, idea 12).
**Open questions:** keep FTS index in sync on write (triggers vs app-side reindex); how to
present mixed result types (tabs: Stories / Chapters / Writers?); do soft-deleted chapters
and unpublished revisions stay out of the index (yes); ranking across the three types.
**Sketch / notes:** FTS5 virtual table(s) maintained on chapter create/edit; tie into the
revision model (Q5) so edits reindex. Heavier than substring but you chose precision.

## Follow writers + followed-only feed  — _status: refining_
**The idea:** "Users should be able to follow writers and have a custom feed of just
writers they follow."
**Why / value:** _(refine)_
**Decided (Q10, 2026-06-16):**
- **Feed filter only** — no notifications system to build yet. Following powers a
  "Following" feed.
- **Follow both writers and stories.** The Following feed mixes "new chapters by writers I
  follow" + "new branches in stories I follow."
- Follower/following counts surface on profiles (Q9).
**Open questions:** ordering of the Following feed (recency vs the hot score from Q7);
de-dup when a followed writer posts in a followed story; how "new branch in a story" is
defined (any new chapter anywhere in that story's tree?).
**Sketch / notes:** polymorphic-ish follow — a `Follow` of {targetType: user|story,
targetId}. Keep it as the substrate notifications could plug into later.

## Back-to-parent navigation button  — _status: refining_
**The idea:** "I would like a clear button that takes me back to the parent chapter."
**Why / value:** _(refine)_
**Decided (Q12, 2026-06-16):**
- Targets the **structural parent** (the chapter's one true authored parent), *not* the
  chapter you arrived from — stable regardless of circle-back links. Clean because F1 keeps
  parentage single (links never create parents).
- At a **root chapter**: button goes to the **story cover page** (`/stories/[id]`), reusing
  the cover surface. ("One level up.")
- A distinct in-page control, not reliant on browser back.
**Open questions:** label/icon (per symbols-over-words); does it appear on every chapter or
only when scrolled? (the header already auto-hides).
**Sketch / notes:** trivial given single-parent invariant — `parentChapterId` or story cover.

## Read / visited indicators  — _status: refining_
**The idea:** "In the option select and on the home page, I want to be able to tell very
quickly which ones I've already read (like when a link goes from blue to purple)."
**Why / value:** _(refine)_
**Decided (F3, 2026-06-16):**
- **Hybrid tracking:** server-side per-account when signed in (cross-device), localStorage
  fallback when logged out; optionally merge device history into the account on login.
- A chapter is marked read on **open** (same event as a view — see "Chapter view counter").
- Read/unread state shown in **both** the option select and the home feed (the blue→purple
  metaphor).
**Open questions:** on login, do we merge prior anonymous device reads into the account?
visual treatment of "read" (dimmed? checkmark? color shift?) within the literary theme.
**Sketch / notes:** account path is the same per-(viewer, chapter) record that powers
unique view counts; keep them one mechanism, not two.

## User settings / privacy  — _status: refining_  (emerged during Q9, 2026-06-16)
**The idea:** Not in the original splat — surfaced while refining profiles: a per-user
**settings** surface, first need being a **"show likes" privacy toggle** that controls
whether the user's liked stories are publicly visible on their profile.
**Why / value:** lets users keep their likes private; gives us a home for future
preferences (theme, notification prefs if those ever land, etc.).
**Open questions:** default on or off? what else belongs in settings on day one (display
name change? the per-story/chapter collaboration defaults from Q5?)? does hiding likes also
hide them from the per-chapter like *count*, or only from the profile list?
**Sketch / notes:** small `User` settings fields (or a `UserSettings` row); start minimal
with just `showLikes`. Establishes the settings page pattern.

## UI convention: symbols over words  — _status: refining_
**The idea:** "Generally we should favor symbols over words for some of this ui stuff — we
shouldn't call it 'likes', for instance, it should be just a symbol. 'Number of children
chapters' should also be a symbol, as should views."
**Why / value:** _(refine)_
**Decided (Q11, 2026-06-16):**
- **Icon source: `lucide-react`** (one consistent, MIT-licensed set; a11y-friendly).
- **Icon + number, always**, with an `aria-label`/tooltip ("12 likes"). The symbol replaces
  the *word*, the number stays visible (not hover-only — better on touch + screen readers).
- Establish a small **shared icon vocabulary** once and reuse everywhere: likes (Heart),
  views (Eye), descendants/continuations (GitFork), + glyphs for official tags.
- **Custom tags stay text chips; official/special tags get a glyph** (from Q4).
**Open questions:** the exact glyph per concept; do we need a tiny shared `<Stat icon=…>`
component so the vocabulary stays consistent across choice cards, feed, profiles?
**Sketch / notes:** cross-cutting convention, not a standalone feature — shapes "Richer
choice cards", "Home feed enrichment", "Chapter view counter", likes UI, and profiles.
