# Shipped features

Completed backlog entries, moved here from `tasks/backlog.md` once the feature merged and the
work was approved. This is the **trail of done work** — the original idea, the decisions, and a
"Shipped" note recording what actually landed (and any divergence from the decided spec).

**Why a separate file:** the backlog stays a list of *open* work, while this preserves the
history without cluttering it. Entries are moved verbatim (status flipped to `done`), newest at
the bottom. See `CLAUDE.md` → "Branches and workflow" for when an entry graduates here.

**Partially-shipped ideas stay in `backlog.md`** — only move an entry once it's fully done.

---

## Chapter view counter  — _status: done (2026-06-21)_
**The idea:** "There should be a view counter for chapters."
**Shipped (2026-06-21):** `ChapterView(chapterId, viewerKey, userId?)` with `@@unique([chapterId,
viewerKey])` (`viewerKey` = account id when signed in, else an anonymous device key — counts
logged-out readers). `recordView` (`src/lib/views.ts`) is idempotent (reload never inflates),
**excludes the author's own** views from the count while still recording their read row, and is
best-effort (never crashes the reader on P2002/P2003). Denormalized `Chapter.viewCount` for cheap
reads; counts surface on the reader, choice cards, and profiles. View == read (one event — see
Read/visited indicators). Open questions all resolved as built.
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

## Choice label distinct from chapter title  — _status: done (2026-06-21)_
**The idea:** "Chapters should have both a title and separate text when in the option
select (like '…climb the stairs' could be the option, but after clicking the actual title
of the chapter might be different)."
**Shipped (2026-06-21):** the `ChapterOption.label` (parent→child edge) is now separate from
the child `Chapter.title` (`prisma/schema.prisma`, `createChildChapter` in `src/lib/chapters.ts`,
migration `chapter_options`). Open-branch authors supply their own label (title defaults to it);
claiming a suggested prompt locks the label. Choice cards show the label, the chapter page shows
the title. (One mechanism with "Author-suggested next-chapter prompts" — also done.)
**Why / value:** _(refine)_
**Decided (F2, 2026-06-16):** the **option label** lives on the parent→child choice edge,
separate from the child chapter's own **title**. Label text originates **either** from a
parent-authored suggested prompt the child claimed, **or** from the child author's own
wording when they open-branch. See "Author-suggested next-chapter prompts" for the slot
mechanics — these two entries describe one mechanism.
**Open questions:** char limit on labels; can a label be edited after the child is written?
**Sketch / notes:** today choices render the child's *title*; this splits "label" (shown in
the option select) from "title" (shown once you're reading the chapter).

## Richer choice cards (tags + like/view counts + descendant count in the option select)  — _status: done (2026-06-21)_
**The idea:** "Tags on chapters should be visible in the option select when choosing the
next chapter to go to." + "The number of likes should be visible in the option select
section along with the tags." + "Another stat of each chapter that should be visible in
option select is the number of children it has (including nested)."
**Shipped (2026-06-21):** `choice-list.tsx` renders each realized choice with its label,
**♥ likes · 👁 views · ⑂ descendants**, **tags** (official glyphs + up to 4 chips with a `+N`
overflow), and read-dimming. Descendant count = whole-subtree count via one recursive CTE
(`getDescendantCounts`, `src/lib/chapters.ts`), computed on-the-fly per page (no cache needed at
current scale); tags batched via `getChaptersTags` to avoid N+1. Uses the symbols-over-words
`<Stat>` vocabulary.
**Open question resolved:** descendant count is a recursive CTE over `parentChapterId`, filtering
soft-deleted rows, computed per render.

## Author-suggested next-chapter prompts  — _status: done (2026-06-21)_
**The idea:** "A chapter writer can leave some suggested options for next chapters and
users can click those and write the next chapter."
**Shipped (2026-06-21):** an unclaimed prompt = a `ChapterOption` with `childChapterId = null`
(label only). `addSuggestedPrompt` / `deleteSuggestedPrompt` (`src/lib/chapters.ts`) gated to the
parent author; the author add/remove UI is in `chapter-reader.tsx`. A child author may **claim**
a prompt (guarded `updateMany` → exactly one writer wins, slot closes) **or** open-branch via the
always-present "create your own option…" card (`choice-list.tsx`). Realized choices sort before
unclaimed prompts.
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

## Back-to-parent navigation button  — _status: done (2026-06-21)_
**The idea:** "I would like a clear button that takes me back to the parent chapter."
**Shipped (2026-06-21):** `chapter-reader.tsx` renders a `← Back` control to the structural
`parentChapterId` (aria-label "Back to the parent chapter", `data-testid="back-to-parent"`) —
stable regardless of how you arrived. **Minor divergence from the decided spec:** at a **root**
chapter (no parent) there's no dedicated back button; the always-present "From <story>"
breadcrumb links to the cover instead. If we want the decided "← to cover" treatment at the root,
that's a small follow-up; otherwise this is functionally complete.
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

## Read / visited indicators  — _status: done (2026-06-21)_
**The idea:** "In the option select and on the home page, I want to be able to tell very
quickly which ones I've already read (like when a link goes from blue to purple)."
**Shipped (2026-06-21):** hybrid tracking — server-side `ChapterView` rows per account
(`getReadChapterIds`) + a localStorage overlay (`read-marker.tsx`, `useLocalReadIds` /
`MarkChapterRead`) namespaced per user, re-synced on `popstate`/`pageshow` so Back-navigation
shows fresh state. Marked read **on open** (same event as a view). Read state shown in **both**
the choice list and the home feed via **card dimming** (visited-link metaphor) with an `sr-only`
"Read." for non-visual users.
**Still optional (was an open question):** merging prior anonymous-device reads into the account
on login is **not** implemented (signed-in tracking starts fresh from account rows).
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

## UI convention: symbols over words  — _status: done (2026-06-21)_
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
state: the Heart **fills red with a black outline** when the viewer has liked.
**Done (2026-06-21):** the convention is now fully in use — `STAT_KINDS` also covers
`chapters`/`stories` (profiles), and **views (Eye) + descendants (GitFork) are consumed** on
choice cards + profiles (the 2026-06-19 "not yet consumed" caveat is obsolete). Remaining icon
work rides each feature's own entry (e.g. a `bookmark` kind for the Bookmark entry). This is a
durable convention, not a one-off task — treat new visual stats as "add a `STAT_KIND`".

## Logout control  — _status: done (2026-06-21)_
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
