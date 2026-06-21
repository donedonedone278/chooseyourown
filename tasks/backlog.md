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

## Suggested build order (sequencing)

_Ordered by dependency, not excitement. With two contributors, independent threads **within
a wave** run in parallel — just coordinate so you don't both grab the same foundation. Each
item graduates to its own `feat/<initials>-<name>` branch + `tasks/todo.md` plan when picked
up. "Quick win" = small, low-merge-conflict, good for warming up the two-person workflow._

**Wave 1 — foundations (most features hang off these; mutually independent → parallelizable):**
- **Tagging system (3)** — biggest single unblocker: richer choice cards, feed enrichment,
  search, tag blacklist, story tag inheritance. Bring **tag moderation** along (crowd-tagging
  is the default → abuse surface).
- **View + read tracking (2 + 14)** — one per-(viewer, chapter) mechanism (F3). Unblocks the
  hot-score feed, read/unread marks, profile stats, and view counts on choice cards.
- **Symbols-over-words infra (16)** — `lucide-react` + a shared `<Stat>` component. Small;
  every visual feature reuses it, so land the convention early. *(Quick win.)*

**Wave 2 — core reader/writer flow (coordinate: touches the reader/editor, conflict-prone):**
- **Options-as-edges (4 + 9)** — split choice *label* from chapter *title*; suggested prompts
  as unclaimed option slots. Restructures the choice model.
- **Non-tree connections (7)** — navigation-edge link layer (shares choice rendering with 4).
- **Terminal/ending chapters (6)** — small; badge + optional branch lock.
- **Back-to-parent button (13)** — trivial, nearly standalone; drop in any time. *(Quick win.)*

**Wave 3 — surfaces that compose the foundations:**
- **Richer choice cards (5)** — tags + likes + views + descendant count + symbols + label.
- **Home feed (10)** — hot-score + Newest tab + tag/like icons.
- **Search (11)** — FTS5 over title/tags/body across stories/chapters/users.

**Wave 4 — social + settings:**
- **User settings surface (17)** — small; hosts show-likes + blacklist mode.
- **Tag blacklist (18)** — needs tags (3) + settings (17).
- **Follow (12)** — follow writers + stories; followed feed.
- **User profiles (1)** — *basic* version (chapter lists) needs nothing new → early quick win;
  *full* version (stats, follower counts, liked stories) needs 2, 12, 17.

**Wave 5 — the heavy one (split into sub-branches):**
- **Collaboration / revision history (8)** — revision storage → edit modes
  (wiki/suggest/locked) → suggest+approve flow → history+restore UI. Sequence late, *or* start
  the revision-storage substrate earlier since search reindex + edit history both want it.

**Cross-cutting:** tags are load-bearing + abuse-sensitive → tag moderation matters more than
it looks. The revision model underpins all collaboration. Profiles ship basic-then-enriched.

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
**Status update (2026-06-19):** shipped the infra on `feat/rs-symbols-stat` — shared
`<Stat>` + icon vocabulary (`STAT_KINDS`: likes=Heart, views=Eye, descendants=GitFork),
migrated the like-count sites + the official-tag glyph map. Likes also gained a "picked"
state: the Heart **fills red with a black outline** when the viewer has liked. Views/
descendants kinds are defined but not yet consumed (await their own waves).

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

## Logout control  — _status: done (2026-06-21)_  (2026-06-21 batch)
**The idea:** 'A "logout" button.'
**Why / value:** **this is a gap today, not future work** — `signOut` is wired in
`src/lib/auth.ts` but **no UI ever calls it**, so a signed-in user currently cannot log out.
Small, standalone quick win; high priority because it's a missing basic.
**Decided / lean:** a sign-out control in the header (and later inside the reader drawer —
see next entry). A server action calling `signOut`; symbols-over-words → `LogOut` glyph.
**Open questions:** header always vs. only inside a profile/drawer menu? confirm redirect
target (home).
**Sketch / notes:** trivial — `signOut()` server action + a button, wired into
`site-header.tsx` where "Signed in as …" currently renders (no logout affordance there today).

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
