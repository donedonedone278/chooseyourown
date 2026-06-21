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
- **When an entry is fully done, move it to `tasks/shipped.md`** (not deleted) as part of
  post-approval cleanup — see `CLAUDE.md` → "Branches and workflow". Keep **partially-shipped**
  entries here (flip status to `partially shipped`, list what's left); only move them once the
  remaining work lands too.

### Per-idea template

```
## <short title>  — _status: raw_
**The idea:** <verbatim splat>
**Why / value:** <who it helps and why it matters — fill in during refining>
**Open questions:** <clarifications to resolve before this is `ready`>
**Sketch / notes:** <data model, UI, edge cases, dependencies — optional, grows over time>
```

---

## Suggested build order (sequencing)

_Ordered by dependency, not excitement. With two contributors, independent threads **within
a wave** run in parallel — just coordinate so you don't both grab the same foundation. Each
item graduates to its own `feat/<initials>-<name>` branch + `tasks/todo.md` plan when picked
up. "Quick win" = small, low-merge-conflict, good for warming up the two-person workflow._

**Progress snapshot (audited 2026-06-21):** Wave 1 and most of Wave 2/3-reader are **shipped** —
tagging, view+read tracking, symbols-over-words, options-as-edges (label≠title + suggested
prompts), richer choice cards, back-to-parent, and the basic user profile are all in `develop`.
What's left clusters in **discovery** (feed/search/browse), **social** (follow, settings,
blacklist, profile enrichment), and the **heavy revision/collaboration** work — plus standalone
quick wins (ending chapters, non-tree links, bookmark). Per-entry status below. **Completed
entries have moved to `tasks/shipped.md`** — the ~~struck-through~~ items below are pointers to
their trail there; the two `partially shipped` ones stay in this file with their remaining work.

**Wave 1 — foundations** — ✅ **all shipped:**
- ~~**Tagging system (3)**~~ — ✅ model + crowd/author permission + official glyphs + story
  top-K inheritance shipped. *Remaining strand:* tag-abuse **moderation** (report/remove for
  tags) + per-chapter permission override — see entry.
- ~~**View + read tracking (2 + 14)**~~ — ✅ shipped (`ChapterView`, unique viewer, read marks
  in feed + choices, profile stats, view counts on cards).
- ~~**Symbols-over-words infra (16)**~~ — ✅ shipped (`<Stat>` + icon vocabulary; views &
  descendants now consumed on choice cards).

**Wave 2 — core reader/writer flow:**
- ~~**Options-as-edges (4 + 9)**~~ — ✅ shipped (label split from title; suggested prompts as
  unclaimed option slots). *(The #9 here = author-suggested prompts, not collaboration.)*
- **Non-tree connections (7)** — ⬜ not started; navigation-edge link layer.
- **Terminal/ending chapters (6)** — ⬜ not started; badge + optional branch lock.
- ~~**Back-to-parent button (13)**~~ — ✅ shipped (← Back to parent; root falls back to the
  cover breadcrumb — see entry for the minor divergence).

**Wave 3 — surfaces that compose the foundations:**
- ~~**Richer choice cards (5)**~~ — ✅ shipped (label + ♥ likes + 👁 views + ⑂ descendants +
  tags + read-dimming).
- **Home feed (10)** — ⬜ still a pure reverse-chron feed (read marks only); no hot-score, no
  Popular/Newest tabs, no tag/like icons on cards. Folded into **Browse (#20)**.
- **Search (11)** — ⬜ not started; FTS5. Folded into **Browse (#20)**.

**Wave 4 — social + settings (none started):**
- **User settings surface (17)** — ⬜ hosts show-likes + blacklist mode + reading prefs.
- **Tag blacklist (18)** — ⬜ needs settings (17).
- **Follow (12)** — ⬜ follow writers + stories; followed feed.
- **User profiles (1)** — 🟡 *basic* version (id-routed public page, stats, Newest/Most-liked
  chapter lists) **shipped**; *enrichment* (bio, follower/following counts, liked-stories list)
  still needs 12 + 17.

**Wave 5 — the heavy one (split into sub-branches, not started):**
- **Collaboration / revision history (8)** — ⬜ revision storage → edit modes
  (wiki/suggest/locked) → suggest+approve flow → history+restore UI. Sequence late, *or* start
  the revision-storage substrate earlier since search reindex + edit history both want it.

**Cross-cutting:** tags are load-bearing + abuse-sensitive → tag moderation matters more than
it looks. The revision model underpins all collaboration. Profiles ship basic-then-enriched.

---

<!-- Splat ideas below this line. -->

## User profiles  — _status: partially shipped (2026-06-21)_
**The idea:** "I want to have user profiles. There should be the ability to look at a
user's chapters chronologically and also sorted by number of likes."
**Shipped (2026-06-21):** public, logged-out-readable profile at `/users/[id]` (routed by
stable `User.id`, @handle shown for display) — `src/app/users/[id]/page.tsx`,
`getUserProfileById` (`src/lib/users.ts`). Has the **two chapter lists** (Newest / Most liked
tabs), **aggregate stats** (chapters, stories started, likes received, profile views — real
`ProfileView` tracking). **No avatar** (as decided). Author bylines link to profiles across the
app.
**Still TODO (enrichment):** **bio**, **follower / following counts** (needs Follow #12),
and the **liked-stories list** gated by the "show likes" setting (needs User settings #17).
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

## Chapter tagging system  — _status: partially shipped (2026-06-21)_
**The idea:** "Chapters should have a tagging system." Tags surface in several places —
see "Richer choice cards", "Home feed enrichment", and "Search".
**Shipped (2026-06-21):** `Tag` + `ChapterTag` join (`src/lib/tags.ts`, `tag-actions.ts`,
`chapter-tags.tsx`). **Curated + free-form** (official tags flagged + carry a glyph via the icon
vocabulary; custom tags are text chips, auto-created on first use). **Crowd-tagging default**
with a per-**story** `tagPermission` ({crowd, author}). Tag-name **normalization**
(`lowercase_with_underscores`, 4–30 chars) + autocomplete. **Story inherited tags = top-K by
count** (`getStoryTopTags`, K=5). Tags render on the reader + choice cards.
**Still TODO:**
- **Tag-abuse moderation** — the report/remove flow is still **chapter-only**; extend it to
  cover tag abuse (the decided "crowd-tagging → abuse surface" strand). *(Tag voting #23 is a
  related but distinct crowd-moderation lever.)*
- **Per-chapter permission override** — permission is per-story only today; the decided
  per-chapter option (ties to collaboration #8) isn't built.
- Official-tag curation/symbol assignment is seed-driven; no admin UI.
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

## Terminal / ending chapters  — _status: refining (not started)_
**The idea:** "One day I want to have an option for chapters that the writer can designate
as a terminal point (like an ending)." (Flagged by user as a later/"one day" item.)
**Audit (2026-06-21):** **not built** — no `isEnding`/`endingEnforced` fields. ⚠️ Note: the story
cover already shows an **"N endings"** stat, but that's a *derived* count of **leaf chapters**
(chapters with no children — `getStoryOverview`), **not** the authored ending flag this entry
describes. Building this means deciding whether that cover stat switches to count authored
`isEnding` chapters instead of leaves.
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

## Home feed enrichment + default to recent-popular  — _status: refining (not started; read-marks shipped)_
**The idea:** "Tags and likes for chapters should also be able to be visible on the feed on
the home page." + "The home page feed should show recent popular chapters by default rather
than just a pure feed."
**Audit (2026-06-21):** the home page is still a **pure reverse-chron** feed (`listRecentChapters`,
`recent-chapter-feed.tsx`). What's already there: **read/unread dimming** on feed cards (from the
Read-indicators work). What's missing (all of this entry's substance): **hot-score** ordering,
the **Popular / Newest** tabs, and **tags + like counts** on feed cards. Build as part of
**Browse (#20)**, which absorbs this.
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
**See also (2026-06-21):** folded into **"Browsing & discovery surface"** — the home page
*is* the browse surface (logged-out users land on it, default sort Popular), and Popular gains
a `6h…all-time` time-window picker. Build these together.

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
**See also (2026-06-21):** subsumed by **"Browsing & discovery surface"** — search is one
control on the unified browse home, alongside tag filter / recency / stat sorts / popularity
windows. Don't build a standalone search page.

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
with just `showLikes`. Establishes the settings page pattern. **Now also hosts the tag
blacklist + its display mode** (see "Tag blacklist" entry).
**Update (2026-06-21):** also the home for **reading prefs** — text size, font, night/day
mode, color scheme — which the **reader drawer** ("Dynamic reader header + side drawer")
surfaces as a reading-relevant subset. Settings #17 stays the source of truth; the drawer is
a shortcut. Reading prefs are account-persisted (cross-device).

## Tag blacklist (blur vs hide)  — _status: refining_
**The idea:** "Users should be able to blacklist tags. In my user settings I should be able
to pick whether I want chapters with blacklisted tags to be blurred (unreadable) but visible
or completely invisible."
**Why / value:** reader content control — avoid genres/themes you don't want to see.
**Decided (2026-06-16):**
- **One global display setting** ({blur, hide}) applied to *all* blacklisted tags (not
  per-tag). A chapter triggers it if it carries **any** blacklisted tag.
- **Blur = click-to-reveal** (soft gate: visible-but-guarded, shows which blacklisted tag
  tripped it, reader can un-blur that chapter). Hide = chapter omitted.
- Applies **everywhere** a chapter surfaces: home feed, option-select choices in the reader,
  search results, profile chapter lists. One rule, all surfaces.
**Open questions:**
- **Dead-end risk (hide mode):** if every continuation of the current chapter is hidden, the
  reader hits an apparent dead end. Lean: show a muted "N continuations hidden by your
  filters" affordance (with a one-off reveal) so it never looks broken.
- Default display mode for a newly blacklisted tag (blur, as the gentler default?).
- Crowd-tagging interaction (Q4): blacklist status shifts as tags change; mis-tag/untag is
  an evasion/abuse vector — does this raise the bar for tag moderation?
- Does an enforced/hard ending or root chapter ever get hidden? (probably treated the same.)
**Sketch / notes:** lives in the user-settings surface (signed-in only). Data:
`BlacklistedTag(userId, tagId)` + a `blacklistMode` setting on the user. Filtering is a
join against the viewer's blacklist on every chapter-listing query — coordinate with the
feed/search/option-select queries so it's one shared helper, not bolted on per surface.

## Bookmark / save-for-later  — _status: raw_
**The idea:** "Could there also be a bookmark button using the bookmark symbol? The fill
color would be a blue." (Distinct from likes: a like is public appreciation; a bookmark is a
private "save this chapter to come back to.")
**Why / value:** lets readers privately save chapters to return to later, independent of the
public like signal — useful in a deep branching tree where it's easy to lose a spot.
**Open questions:**
- **Viewing surface:** is the first pass just the per-chapter toggle (saved state persists),
  or does it also ship a **"My bookmarks" page** listing saved chapters? (A toggle with
  nowhere to view saves is only half-useful.)
- Bookmarks on **chapters** (matches likes/views granularity) or on **stories**? Lean:
  chapters.
- Should the bookmark state surface in option-select / feed cards, or only in the reader?
- Signed-in only (needs an account to attach the save to) — confirm.
**Sketch / notes:** mirrors `ChapterLike` — a `ChapterBookmark(chapterId, userId)` join with
`@@unique([chapterId, userId])`, a toggle server action, and a `bookmark` entry added to the
symbols-over-words `STAT_KINDS` vocabulary: **Bookmark** glyph, picked state = **blue fill**
(parallels the red-fill Heart for likes). Reuses the `<Stat active>` accent mechanism already
built on `feat/rs-symbols-stat`. Graduates to its own `feat/<initials>-bookmark` branch.

## Browsing & discovery surface  — _status: refining_  (2026-06-21 batch)
**The idea:** "Browsing (including searching, browsing by tag, browsing by recency, sorting
by stats, popularity in the past 6hours/day/week/month/year/alltime)."
**Why / value:** the single discovery surface — how readers find stories/chapters beyond a
plain reverse-chron list.
**Relationship to existing entries:** this **absorbs Search (#11)** and **reshapes Home
feed enrichment (#10)** — they're one discovery surface seen from different angles. Build
them as one thread, not three.
**Decided (2026-06-21):**
- **The home page *is* the browse surface** — especially for **logged-out users, who land
  directly on browse with a sensible default sort already applied** (lean: Popular). "Very
  intuitive" — no separate `/browse` route; discovery is the front door, not a destination.
  (Signed-in landing may later default differently, e.g. a Following feed — see #12.)
- **Controls:** free-text **search** (FTS5, per #11), **tag filter**, **recency** sort,
  **stat sorts** (likes / views / descendants), and a **popularity time-window** picker —
  `6h · day · week · month · year · all-time`. Popularity = the hot-score (#10) computed
  *within the selected window*.
**Open questions:**
- Result type: chapters, stories, or a toggle? (lean: toggle; default depends on sort.)
- Does the time-window apply only to the Popular sort, or also gate the stat sorts?
- Logged-out default (Popular) vs signed-in default (Following #12?) on the home landing.
- How windowed popularity is computed/cached: per-window precompute vs. on-the-fly hot-score
  over a time-filtered like/view query — ties to view-row retention (see "Chapter view counter").
**Sketch / notes:** needs likes + views + age per chapter (have likes + `ChapterView`), an
FTS5 index (#11), and the tag join (#3). Windowed popularity = hot-score over rows within
`[now − window, now]`.

## Dynamic reader header + side drawer  — _status: refining_  (2026-06-21 batch)
**The idea:** "Changing the scroll-aware header to be more dynamic (when reading a chapter it
should show just the story, chapter name, like/save button, and a hamburger menu button that
opens a side drawer. Populating that side drawer with links to browse, the user's profile,
settings, text size/font, color scheme, etc."
**Why / value:** a reading-mode chrome that stays out of the way but keeps the essentials
(where am I · like/save · menu) one tap away; the drawer becomes the app's primary nav +
reading-prefs surface.
**Decided (2026-06-21):**
- **Header is mode-aware.** In the **reader** it shows: **story title · chapter name · like +
  save buttons · hamburger**. Elsewhere, the normal site header. (Save = the **Bookmark**
  entry's blue-fill toggle — build them together.)
- **Drawer = nav + a *subset* of settings.** Links: **browse · profile · full Settings page**.
  Plus **reading-relevant prefs inline** — **text size, night/day mode, font, color scheme** —
  i.e. the drawer carries the *reading* subset, while the **full Settings page (#17)** remains
  the complete home and source of truth for these prefs. Drawer also holds non-settings items
  (nav, logout).
**Relationship to existing entries:** depends on **Bookmark** (save), **Settings #17** (prefs
home), **Logout control**; the prefs (text size / font / scheme / night mode) are
**account-persisted settings** in #17, surfaced as a reading subset in the drawer.
**Open questions:**
- Persisted (cross-device via #17) vs device-local? — lean **persisted**, since the drawer is
  explicitly "a subset of the settings available in the full settings page."
- Night mode / color scheme: does this pull a broader **theming** effort forward as its own
  dependency (feeds the density tokens below)?
- Scroll behavior (`header-shell.tsx` already auto-hides on scroll); drawer side (L/R); does
  the drawer exist globally or only in reading mode?
**Sketch / notes:** `site-header.tsx` gains a reader variant; new client drawer component;
reading prefs read/write the #17 settings; theming tokens shared with the visual-density work.

## Tag voting (rank + threshold auto-hide)  — _status: refining_  (2026-06-21 batch)
**The idea:** "Voting on tags (as in, users who agree with a tag can vote on it to rank it
higher on the story's list of tags or vote it down to disagree)."
**Why / value:** crowd-curates which tags best describe a story — good tags rise, mis-tags
sink — and adds a lightweight moderation lever on the crowd-tagging surface (#3).
**Decided (2026-06-21):**
- **Upvote raises rank, downvote lowers it.** Score = upvotes − downvotes; the **story tag
  list orders by score** (overriding frequency/creation order for *display ranking*).
- **Downvotes are crowd moderation via threshold auto-hide:** a tag whose score falls **below
  −N is auto-hidden** from tag lists (soft-removed) and **reappears if votes recover**
  (reversible). **Not a hard delete.**
**Relationship to existing entries:** extends **Tagging #3** and its **tag-moderation** strand;
interacts with **Tag blacklist #18** (a hidden tag shouldn't trip a blacklist) and with **story
top-K inheritance** (rank by vote score, not just frequency).
**Open questions:**
- Threshold N + anti-brigading (rate-limit, weight by account age?); auto-hide per-chapter-tag
  or per story-level tag?
- One vote per user per (chapter-)tag; can a vote be changed/retracted?
- Does vote score feed **story inherited tags** ranking (top-K by score vs. by count)?
- Does auto-hide retire manual tag reports, or do both coexist?
**Sketch / notes:** `ChapterTagVote(chapterTagId, userId, value ∈ {+1,−1})` with `@@unique`;
denormalized score on `ChapterTag` for cheap ordering + threshold checks; hidden when
`score < −N`.

## Bulk-add tags when editing  — _status: refining_  (2026-06-21 batch)
**The idea:** "When editing a chapter writers should be able to bulk-add tags."
**Why / value:** adding tags one-at-a-time is tedious; let writers add several at once while
editing.
**Relationship to existing entries:** a UX enhancement on **Tagging #3** (the model + crowd
add/remove already shipped: `chapter-tags.tsx`, `tag-actions.ts`, `src/lib/tags.ts`).
**Open questions:** input shape — comma/space-separated entry, multi-select from the official
vocabulary, or both? respect the per-chapter "who can tag" permission? cap per chapter; how
unknown/custom tags get created in bulk (auto-create vs. confirm); dedup + normalization on
batch entry.
**Sketch / notes:** extend the tag editor with a batch add action — one transaction, skip
dupes, validate each name.

## Visual density pass (compact the UI)  — _status: refining_  (2026-06-21 batch)
**The idea:** "We also need to do a visual pass to compact the visuals on the site a bit —
some things are a bit too spread out/enlarged."
**Why / value:** tighter, more scannable layout; less scrolling; serves the "calm and
scannable" UI principle.
**Decided (2026-06-21):**
- **Do it as a density-token system, not an ad-hoc sweep:** introduce shared spacing/size
  tokens (a tightened `--space-*` / font scale) and apply them repo-wide, so density stays
  consistent and future UI inherits it. Bigger first pass, durable convention.
**Relationship to existing entries:** cross-cutting like **symbols-over-words (#16)**; the
**reader drawer's** font / text-size / color-scheme prefs should ride the *same* token system
(text-size pref = scaling a `--font-*` token).
**Open questions:** audit first — which surfaces are worst (feed cards, choice cards, reader,
profile)? define the scale (and does the user text-size pref multiply it?); a11y floors
(min tap target / font size) the compaction must not cross.
**Sketch / notes:** establish tokens in global CSS, migrate component modules surface-by-
surface; pairs naturally with the drawer's typography prefs.
