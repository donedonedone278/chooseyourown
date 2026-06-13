# Collaborative Choose-Your-Own-Adventure Website Design

Date: 2026-06-12

## Overview

Build a collaborative website where users can create branching choose-your-own-adventure stories. A user can start a new story by writing its first chapter, and other signed-in users can extend that story by writing new chapters that continue from an existing chapter. The first release should optimize for both easy story creation and fast discovery of fresh content, with a slight product emphasis on readers noticing newly added chapters across the site.

## Product Model

The core content model is:

- A **story** is a collection of related chapters.
- A **chapter** belongs to exactly one story.
- A chapter may have **zero or one parent chapter**.
- A chapter may have **many child chapters**.

Each new chapter extends exactly one existing chapter, or no chapter if it is the root chapter that starts a story. At the end of a chapter, readers see the available **choices**, which are links to that chapter's child chapters. Each choice displays the like count of its follow-up chapter so readers can see which paths are resonating.

For the first version, every published chapter is open to new child chapters by default. Per-chapter gating, approval rules, and contributor restrictions are out of scope for the initial release.

## Goals

1. Let signed-in users start stories and add new chapters without confusion.
2. Let readers discover recently added chapters across all stories quickly.
3. Preserve the familiar choose-your-own-adventure reading flow: read a chapter, then choose among follow-up chapters.
4. Keep the first release simple enough to implement reliably without moderation workflows or advanced author permissions.

## Non-Goals

The first version does not include:

- Chapter approval before publication
- Per-chapter contribution controls
- Links inside chapter body content
- Images or media uploads in chapter content
- Automated content filtering
- Draft autosave

Draft autosave is intentionally deferred to a later iteration to keep the initial scope tighter, though the system should be designed so that draft persistence can be added later without rewriting the chapter model.

## User Experience

### Homepage

The homepage centers on a global feed of newly added chapters across all stories. Each feed item should make it easy to:

- open the chapter directly
- navigate to the parent story
- understand that the chapter is part of a branching story

This feed is the primary discovery surface for fresh activity.

### Story Reading

Readers can open a story and read through it chapter by chapter. The essential interaction is:

1. Open a chapter.
2. Read the chapter body.
3. Reach the end of the chapter.
4. See the available choices as links to follow-up chapters.
5. Choose one path and continue reading.

The list of available choices at the end of a chapter should display in chapter-creation order so the interface stays stable as like counts change. Story pages should also expose the branching structure clearly enough that a reader can understand where the current chapter sits within the larger story.

### Writing

Signed-in users can:

- start a new story by writing its first chapter
- add a new child chapter to an existing chapter

New chapters publish immediately after successful submission. Once published, a new chapter should appear:

- at the end of its parent chapter as a new choice
- within the story's chapter structure
- in the global recent-chapters feed

## Content Rules

Chapter content supports basic rich-text formatting such as paragraphs, bold text, and italics. Inline links are not allowed in the first version. Content validation should run server-side so stored chapter content is always in an allowed format, regardless of client behavior.

## Core Components

The product should be organized into a small number of clear parts:

### Reader-Facing Web App

Responsible for the homepage feed, story pages, chapter reading, choice navigation, and chapter likes.

### Authenticated Writing Flow

Responsible for sign-in-gated story creation and chapter creation. The write flow should stay focused on creating valid chapter content and attaching it to the correct parent chapter.

### Backend API

Responsible for stories, chapters, likes, user accounts, and content reports. The API should separate read-heavy endpoints from write endpoints so the reading experience stays fast and the create/update logic remains easier to reason about.

### Admin Review Surface

The first version only needs enough administrative capability to review reports and remove bad content after publication. It does not need pre-publication moderation.

## Data Flow

### Reading Flow

1. The homepage requests the recent-chapters feed.
2. A reader opens a chapter from the feed or from within a story.
3. The system loads the chapter, its story context, and its child chapters.
4. The UI renders the chapter body followed by the available choices.
5. Each choice links to a child chapter and shows that chapter's like count.

### Writing Flow

1. A signed-in user chooses to start a story or add a chapter under an existing chapter.
2. The user submits chapter content and, when relevant, the parent chapter reference.
3. The backend validates the user, the target story/chapter relationship, and the chapter content format.
4. The backend stores the new chapter and attaches it to the story tree.
5. The new chapter is immediately readable in the story and visible in the recent-chapters feed.

### Like Flow

1. A signed-in user likes a chapter.
2. The backend records a single like for that user/chapter pair.
3. Updated like totals appear anywhere that chapter is shown as a readable chapter or as a choice option.

### Report Flow

1. A signed-in user reports a chapter.
2. The backend stores a report record for later admin review.
3. The chapter remains published unless an admin removes it.

## Error Handling and Guardrails

The first release should fail clearly and preserve user intent where possible.

- Unauthenticated users attempting to write should be redirected into sign-in before submission can succeed.
- If a chapter submission is invalid, the UI should show a direct error instead of failing silently.
- If the target parent chapter or story no longer exists, the user should receive an explicit error.
- Duplicate likes from the same user on the same chapter should be rejected.
- Chapter formatting should be validated server-side.

Because publication is immediate, the safety model for the first version is intentionally lightweight:

- writing requires authentication
- readers can report bad content
- admins can review reports and remove content later

## Testing Strategy

Frontend browser coverage is a first-class requirement. The system should include end-to-end tests, ideally with Playwright, that verify the real user experience rather than only API behavior.

The highest-value automated scenarios are:

1. A signed-in user starts a new story by publishing the first chapter.
2. A reader opens a chapter and sees choice links at the end of the chapter.
3. Each rendered choice shows the like count for its follow-up chapter.
4. A signed-in user adds a new child chapter under an existing chapter.
5. A newly published chapter appears both in the story flow and in the recent-chapters feed.
6. A signed-in user can like a chapter once, and duplicate-like attempts are blocked.

Lower-level tests should still verify branching invariants and validation rules, especially:

- a chapter belongs to exactly one story
- a non-root chapter attaches to exactly one parent chapter
- invalid chapter payloads are rejected
- duplicate likes are rejected

## Scope Boundaries for the First Implementation Plan

The first implementation plan should stay focused on the core collaborative storytelling loop:

- account-backed chapter creation
- recent-chapters discovery
- branching chapter reading
- per-chapter likes
- basic reporting/admin removal support
- frontend end-to-end coverage

It should avoid expanding into social features, rich moderation systems, advanced formatting, or draft persistence until the core loop works well.
