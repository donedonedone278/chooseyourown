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

## User profiles  — _status: raw_
**The idea:** "I want to have user profiles. There should be the ability to look at a
user's chapters chronologically and also sorted by number of likes."
**Why / value:** _(refine)_
**Open questions:** _(pending — splat phase)_
**Sketch / notes:** _(refine)_

## Chapter view counter  — _status: raw_
**The idea:** "There should be a view counter for chapters."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Chapter tagging system  — _status: raw_
**The idea:** "Chapters should have a tagging system." Tags surface in several places —
see "Richer choice cards", "Home feed enrichment", and "Search".
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Choice label distinct from chapter title  — _status: raw_
**The idea:** "Chapters should have both a title and separate text when in the option
select (like '…climb the stairs' could be the option, but after clicking the actual title
of the chapter might be different)."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Richer choice cards (tags + like/view counts + descendant count in the option select)  — _status: raw_
**The idea:** "Tags on chapters should be visible in the option select when choosing the
next chapter to go to." + "The number of likes should be visible in the option select
section along with the tags." + "Another stat of each chapter that should be visible in
option select is the number of children it has (including nested)."
**Why / value:** _(refine)_
**Open questions:** _(pending — "children including nested" = descendant count, a
recursive/aggregate query; how computed/cached?)_
**Sketch / notes:** stats shown here should follow the "symbols over words" convention
(see below). Likely set: ♥ likes · 👁 views · ⑂ descendants · tags.

## Terminal / ending chapters  — _status: raw_
**The idea:** "One day I want to have an option for chapters that the writer can designate
as a terminal point (like an ending)." (Flagged by user as a later/"one day" item.)
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Non-tree connections (circle back / link to existing chapters)  — _status: raw_
**The idea:** "I also would like chapters to be able to circle back to previous chapters
or connect to other chapters."
**Why / value:** _(refine)_
**Open questions:** _(pending — this turns the chapter tree into a graph; big data-model
implication)_
**Sketch / notes:** _(refine)_

## Story collaboration settings (wiki / suggested edits + version history)  — _status: raw_
**The idea:** "When a user creates a chapter they should be able to designate a few things
about their story. One is that they can allow other users to make edits, like a wiki. Or
they can turn on a setting so people suggest edits and the author can approve or reject.
Previous iterations of chapters should be kept just in case."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Author-suggested next-chapter prompts  — _status: raw_
**The idea:** "A chapter writer can leave some suggested options for next chapters and
users can click those and write the next chapter."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Home feed enrichment + default to recent-popular  — _status: raw_
**The idea:** "Tags and likes for chapters should also be able to be visible on the feed on
the home page." + "The home page feed should show recent popular chapters by default rather
than just a pure feed."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Search (tags, titles, etc.)  — _status: raw_
**The idea:** "There should be searching based on tags and titles and etc."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Follow writers + followed-only feed  — _status: raw_
**The idea:** "Users should be able to follow writers and have a custom feed of just
writers they follow."
**Why / value:** _(refine)_
**Open questions:** _(pending)_
**Sketch / notes:** _(refine)_

## Back-to-parent navigation button  — _status: raw_
**The idea:** "I would like a clear button that takes me back to the parent chapter."
**Why / value:** _(refine)_
**Open questions:** _(pending — interacts with "circle back / multiple parents": which
parent if a chapter can have more than one?)_
**Sketch / notes:** _(refine)_

## Read / visited indicators  — _status: raw_
**The idea:** "In the option select and on the home page, I want to be able to tell very
quickly which ones I've already read (like when a link goes from blue to purple)."
**Why / value:** _(refine)_
**Open questions:** _(pending — does "read" mean visited-this-device, or per-account
server-tracked? ties to the view-counter idea)_
**Sketch / notes:** _(refine)_

## UI convention: symbols over words  — _status: raw_
**The idea:** "Generally we should favor symbols over words for some of this ui stuff — we
shouldn't call it 'likes', for instance, it should be just a symbol. 'Number of children
chapters' should also be a symbol, as should views."
**Why / value:** _(refine)_
**Open questions:** _(pending — accessibility: icons still need accessible labels /
`aria-label` even when visually icon-only; pick an icon set/source)_
**Sketch / notes:** cross-cutting convention, not a standalone feature — it shapes "Richer
choice cards", "Home feed enrichment", "Chapter view counter", and likes UI. Worth pinning
down a small icon vocabulary once and reusing it everywhere.
