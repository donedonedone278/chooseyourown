# Task 7 — Likes, reports, and the minimal admin surface

> Rewritten from `docs/superpowers/plans/2026-06-12-choose-your-own-adventure.md` (Task 7)
> to match the **actual** project: Markdown content (not JSON), **server actions**
> (not `fetch` to API route handlers), the existing `requireUser`/`requireAdminUser`
> helpers, and the existing factories. Work strictly **test-first**: write the failing
> test, run it red, implement, run it green, then commit.

## Context

The reader already shows like *counts* on child-chapter choices, but there is no way to
like a chapter, no way to report one, and no admin surface to act on reports. The schema
already has everything we need — `ChapterLike` (`@@unique([chapterId, userId])`),
`ChapterReport` (`reason`, `resolvedAt`, `removedAt`), and `User.isAdmin`. This task wires
up the behavior: per-user likes (one per user, idempotent), post-hoc reporting, and a
simple admin page that soft-deletes reported chapters. Publication stays immediate;
moderation is after-the-fact only.

## Design decisions (read before coding)

1. **Server actions, not API routes.** The original plan used `POST /api/chapters/[id]/like`
   + client `fetch`. Every mutation in this repo is a **server action** read from a
   `<form action={...}>` (`createStory`, `createChildChapterAction`, `signUp`). Follow that
   pattern — do **not** add files under `src/app/api/chapters/`.

2. **Admin protection lives in the page, not middleware.** The plan listed `src/middleware.ts`
   using `auth(...)`. Skip it. `src/lib/auth.ts` imports Prisma + bcrypt, so importing it from
   edge middleware breaks the bundle. We already have `requireAdminUser()` which redirects
   non-admins; call it at the top of the admin page (server component). This is the simpler,
   build-safe guard and matches how `requireUser()` already gates writing.

3. **Likes are idempotent at the action layer.** `likeChapter()` (lib) throws `'already liked'`
   on the `P2002` duplicate — the unit test asserts this. The *action* catches that and treats
   it as a no-op success, so a double-click never shows the user an error. The reader renders a
   disabled "Liked" state when the viewer has already liked (no unlike in scope).

4. **Distinct accessible names.** Choices already render `"N likes"` inside `<main>`. The current
   chapter's own like control must use different copy (e.g. button "Like" / "Liked", count text
   "Liked by N readers") to avoid Playwright strict-mode collisions — per the repo's e2e convention.

5. **Admin removal is split for testability.** Put the transactional removal/dismiss logic in
   `src/lib/reports.ts` (pure, no auth → unit-testable in the node tier). The admin-gated
   *actions* in `src/actions/report-actions.ts` just call `requireAdminUser()` then delegate.
   (Node-tier unit tests must not import `auth.ts`/next-auth — keep the logic in the lib.)

---

## Step 1 — Domain layer: likes & reports (`src/lib/chapters.ts`, `src/lib/reports.ts`)

### 1a. Failing unit test — `tests/unit/likes.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { likeChapter } from '@/lib/chapters';
import { createUser, createStory, createChapter } from '@/test/factories';

describe('likeChapter', () => {
  it('allows one like per user per chapter and rejects duplicates', async () => {
    const user = await createUser();
    const story = await createStory({ authorId: user.id });
    const chapter = await createChapter({ storyId: story.id, authorId: user.id });

    const like = await likeChapter({ chapterId: chapter.id, userId: user.id });
    expect(like.chapterId).toBe(chapter.id);

    await expect(likeChapter({ chapterId: chapter.id, userId: user.id })).rejects.toThrow(
      'already liked'
    );
  });
});
```

### 1b. Failing unit test — `tests/unit/reports.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { reportChapter, getChapterWithChoices } from '@/lib/chapters';
import { listOpenReports, removeReportedChapter } from '@/lib/reports';
import { createUser, createStory, createChapter } from '@/test/factories';

describe('reports', () => {
  it('records a report, lists it as open, and removing it soft-deletes the chapter', async () => {
    const user = await createUser();
    const story = await createStory({ authorId: user.id });
    const chapter = await createChapter({ storyId: story.id, authorId: user.id });

    const report = await reportChapter({
      chapterId: chapter.id,
      userId: user.id,
      reason: 'Spam content'
    });

    const open = await listOpenReports();
    expect(open.map((r) => r.id)).toContain(report.id);

    await removeReportedChapter(report.id);

    // Chapter is hidden from reader queries…
    expect(await getChapterWithChoices(chapter.id)).toBeNull();
    // …and the report no longer counts as open.
    const stillOpen = await listOpenReports();
    expect(stillOpen.map((r) => r.id)).not.toContain(report.id);
  });
});
```

Run red: `npm run test:unit -- tests/unit/likes.test.ts tests/unit/reports.test.ts`

### 1c. Implement in `src/lib/chapters.ts`
Add the `Prisma` import and two helpers. Extend `getChapterWithChoices` to also return the
current chapter's own like count.
```ts
import { Prisma } from '@prisma/client';
// ...existing imports/db...

export async function likeChapter(input: { chapterId: string; userId: string }) {
  try {
    return await db.chapterLike.create({ data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('already liked');
    }
    throw error;
  }
}

export async function reportChapter(input: {
  chapterId: string;
  userId: string;
  reason: string;
}) {
  return db.chapterReport.create({ data: input });
}

export async function hasUserLikedChapter(chapterId: string, userId: string) {
  const like = await db.chapterLike.findUnique({
    where: { chapterId_userId: { chapterId, userId } } // composite @@unique
  });
  return like !== null;
}
```
In `getChapterWithChoices`, add `_count: { select: { likes: true } }` to the **top-level**
`include` (the `childChapters` already have it) so the reader can show the current chapter's count.

### 1d. Implement `src/lib/reports.ts` (new)
```ts
import { db } from '@/lib/db';

/** Reports awaiting admin action (neither resolved nor removed), oldest first. */
export function listOpenReports() {
  return db.chapterReport.findMany({
    where: { removedAt: null, resolvedAt: null },
    include: { chapter: true, user: true },
    orderBy: { createdAt: 'asc' }
  });
}

/** Admin removal: soft-delete the reported chapter and close the report. */
export async function removeReportedChapter(reportId: string) {
  return db.$transaction(async (tx) => {
    const report = await tx.chapterReport.findUniqueOrThrow({ where: { id: reportId } });
    await tx.chapter.update({
      where: { id: report.chapterId },
      data: { deletedAt: new Date() }
    });
    await tx.chapterReport.update({
      where: { id: reportId },
      data: { removedAt: new Date(), resolvedAt: new Date() }
    });
  });
}

/** Dismiss a report without removing the chapter. */
export function dismissReport(reportId: string) {
  return db.chapterReport.update({
    where: { id: reportId },
    data: { resolvedAt: new Date() }
  });
}
```
Run green: `npm run test:unit -- tests/unit/likes.test.ts tests/unit/reports.test.ts`

---

## Step 2 — Server actions (`src/actions/chapter-actions.ts`, `src/actions/report-actions.ts`)

### 2a. Reader-facing actions — extend `src/actions/chapter-actions.ts`
```ts
import { revalidatePath } from 'next/cache';
import { likeChapter, reportChapter } from '@/lib/chapters';
// ...existing 'use server', requireUser imports...

export async function likeChapterAction(chapterId: string, storyId: string) {
  const session = await requireUser();
  try {
    await likeChapter({ chapterId, userId: session.user.id });
  } catch (error) {
    // One-like-per-user: a repeat click is a harmless no-op, not an error.
    if (!(error instanceof Error) || error.message !== 'already liked') throw error;
  }
  revalidatePath(`/stories/${storyId}/chapters/${chapterId}`);
}

type ReportState = { status: 'idle' | 'submitted' };

export async function reportChapterAction(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const session = await requireUser();
  const chapterId = String(formData.get('chapterId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!chapterId || !reason) throw new Error('A reason is required to report a chapter.');

  await reportChapter({ chapterId, userId: session.user.id, reason });
  return { status: 'submitted' };
}
```
`likeChapterAction` is bound with `chapterId`/`storyId` in the reader form.
`reportChapterAction` uses the React 19 `useActionState` signature (`(prevState, formData)`),
with `chapterId` carried as a hidden input.

### 2b. Admin actions — `src/actions/report-actions.ts` (new)
```ts
'use server';

import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { removeReportedChapter, dismissReport } from '@/lib/reports';

export async function removeReportedChapterAction(reportId: string) {
  await requireAdminUser();
  await removeReportedChapter(reportId);
  redirect('/admin/reports');
}

export async function dismissReportAction(reportId: string) {
  await requireAdminUser();
  await dismissReport(reportId);
  redirect('/admin/reports');
}
```

---

## Step 3 — Reader UI: like control + report form

### 3a. Report widget — `src/components/chapters/report-chapter.tsx` (new, client)
```tsx
'use client';

import { useActionState } from 'react';
import { reportChapterAction } from '@/actions/chapter-actions';

export function ReportChapter({ chapterId }: { chapterId: string }) {
  const [state, formAction] = useActionState(reportChapterAction, { status: 'idle' as const });

  if (state.status === 'submitted') return <p>Report submitted</p>;

  return (
    <details>
      <summary>Report chapter</summary>
      <form action={formAction}>
        <input type="hidden" name="chapterId" value={chapterId} />
        <label>
          Reason
          <textarea name="reason" required rows={3} />
        </label>
        <button type="submit">Submit report</button>
      </form>
    </details>
  );
}
```
> `<summary>Report chapter</summary>` is exposed to Playwright's `getByRole('button', { name: 'Report chapter' })`. Confirm during the green run; if the role lookup misses, switch the toggle to a real `<button>` + `useState`.

### 3b. Update `src/components/chapters/chapter-reader.tsx`
Add props `likeCount: number`, `viewerHasLiked: boolean`, `isSignedIn: boolean`, and render,
after `<MarkdownContent />` and before the Choices section:
```tsx
<section aria-label="Reactions">
  <p>Liked by {likeCount} {likeCount === 1 ? 'reader' : 'readers'}</p>
  {isSignedIn ? (
    <form action={likeChapterAction.bind(null, chapterId, storyId)}>
      <button type="submit" disabled={viewerHasLiked}>
        {viewerHasLiked ? 'Liked' : 'Like'}
      </button>
    </form>
  ) : (
    <Link href="/auth/sign-in">Sign in to like</Link>
  )}
  {isSignedIn ? <ReportChapter chapterId={chapterId} /> : null}
</section>
```
Import `likeChapterAction` from `@/actions/chapter-actions` and `ReportChapter` from the new
component. Keep the existing Choices copy (`"N likes"`) unchanged — distinct from "Liked by N readers".

### 3c. Update the reader page `src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`
```tsx
import { auth } from '@/lib/auth';
import { getChapterWithChoices, hasUserLikedChapter } from '@/lib/chapters';
// ...
const session = await auth();
const userId = session?.user?.id;
const viewerHasLiked = userId ? await hasUserLikedChapter(chapter.id, userId) : false;
// pass to <ChapterReader />:
//   likeCount={chapter._count.likes}
//   viewerHasLiked={viewerHasLiked}
//   isSignedIn={Boolean(userId)}
```

---

## Step 4 — Admin reports page (`src/app/admin/reports/page.tsx`, new)

```tsx
import { requireAdminUser } from '@/lib/auth';
import { listOpenReports } from '@/lib/reports';
import { removeReportedChapterAction, dismissReportAction } from '@/actions/report-actions';

export default async function ReportsPage() {
  await requireAdminUser(); // redirects non-admins home / signed-out to sign-in
  const reports = await listOpenReports();

  return (
    <main>
      <h1>Open reports</h1>
      {reports.length === 0 ? (
        <p>No open reports.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <h2>{report.chapter.title}</h2>
              <p>{report.reason}</p>
              <p>Reported by {report.user.displayName}</p>
              <form action={removeReportedChapterAction.bind(null, report.id)}>
                <button type="submit">Remove chapter</button>
              </form>
              <form action={dismissReportAction.bind(null, report.id)}>
                <button type="submit">Dismiss</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```
Add an admin nav link in `src/components/layout/site-header.tsx` (inside the signed-in branch):
```tsx
{session.user.isAdmin ? <Link href="/admin/reports">Reports</Link> : null}
```

---

## Step 5 — E2e: like + report (`tests/e2e/reporting.spec.ts`, new)

Follow the existing spec style: sign up (writing/liking are auth-gated), publish a story,
scope assertions to a landmark, use a `Date.now()` stamp for unique inputs.
```ts
import { expect, test } from '@playwright/test';

test('a signed-in reader can like a chapter and report it', async ({ page }) => {
  const stamp = Date.now();
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley');
  await page.getByLabel('Email').fill(`riley-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Likeable ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('A chapter worth reacting to.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Chapter ${stamp}` })).toBeVisible();

  // Like → count goes 0 → 1 and the button reads "Liked".
  await expect(page.locator('main').getByText('Liked by 0 readers')).toBeVisible();
  await page.locator('main').getByRole('button', { name: 'Like' }).click();
  await expect(page.locator('main').getByText('Liked by 1 reader')).toBeVisible();
  await expect(page.locator('main').getByRole('button', { name: 'Liked' })).toBeDisabled();

  // Report → confirmation message.
  await page.getByRole('button', { name: 'Report chapter' }).click();
  await page.getByLabel('Reason').fill('Spam content');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Report submitted')).toBeVisible();
});
```
> Admin removal e2e is **deferred to Task 8**, which seeds an admin account — sign-up only
> creates non-admin users, so there's no way to log in as an admin in the browser yet. The
> removal/dismiss logic is covered by `tests/unit/reports.test.ts` (Step 1b).

---

## Step 6 — Full gate + commit

```bash
npm test   # lint → typecheck → unit → e2e (fail-fast)
```
If green:
```bash
git add src/lib/chapters.ts src/lib/reports.ts \
        src/actions/chapter-actions.ts src/actions/report-actions.ts \
        src/components/chapters/report-chapter.tsx src/components/chapters/chapter-reader.tsx \
        src/app/stories/[storyId]/chapters/[chapterId]/page.tsx \
        src/app/admin/reports/page.tsx src/components/layout/site-header.tsx \
        tests/unit/likes.test.ts tests/unit/reports.test.ts tests/e2e/reporting.spec.ts
git commit -m "feat: add chapter likes, reporting, and admin removal"
git push   # standing authorization for develop
```

---

## File checklist

**New**
- [ ] `src/lib/reports.ts`
- [ ] `src/actions/report-actions.ts`
- [ ] `src/components/chapters/report-chapter.tsx`
- [ ] `src/app/admin/reports/page.tsx`
- [ ] `tests/unit/likes.test.ts`
- [ ] `tests/unit/reports.test.ts`
- [ ] `tests/e2e/reporting.spec.ts`

**Modified**
- [ ] `src/lib/chapters.ts` — `likeChapter`, `reportChapter`, `hasUserLikedChapter`, top-level `_count.likes`
- [ ] `src/actions/chapter-actions.ts` — `likeChapterAction`, `reportChapterAction`
- [ ] `src/components/chapters/chapter-reader.tsx` — reactions section
- [ ] `src/app/stories/[storyId]/chapters/[chapterId]/page.tsx` — session + like state props
- [ ] `src/components/layout/site-header.tsx` — admin Reports link

**Deliberately NOT created** (divergence from original plan, see Design decisions)
- `src/app/api/chapters/[chapterId]/like/route.ts`, `.../report/route.ts` — using server actions instead
- `src/middleware.ts` — admin guarded in-page via `requireAdminUser()`

## Review (fill in after implementation)

Implemented exactly per plan, with one deliberate deviation:

- `src/lib/chapters.ts`: added `likeChapter`, `reportChapter`, `hasUserLikedChapter`, and
  extended `getChapterWithChoices` with a top-level `_count.likes` include.
- `src/lib/reports.ts` (new): `listOpenReports`, `removeReportedChapter` (transactional
  soft-delete + report close), `dismissReport`.
- `src/actions/chapter-actions.ts`: added `likeChapterAction` (idempotent no-op on
  `'already liked'`) and `reportChapterAction` (React 19 `useActionState` signature).
- `src/actions/report-actions.ts` (new): `removeReportedChapterAction`,
  `dismissReportAction`, both gated by `requireAdminUser()`.
- `src/components/chapters/report-chapter.tsx` (new, client): report widget.
- `src/components/chapters/chapter-reader.tsx`: new "Reactions" section with
  "Liked by N reader(s)" text, Like/Liked button (or sign-in link when signed out), and
  the report widget for signed-in viewers.
- `src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`: reads the session and
  `hasUserLikedChapter`, passes `likeCount`/`viewerHasLiked`/`isSignedIn` to the reader.
- `src/app/admin/reports/page.tsx` (new): lists open reports with Remove/Dismiss forms,
  gated by `requireAdminUser()`.
- `src/components/layout/site-header.tsx`: added a "Reports" nav link for admins.
- Tests: `tests/unit/likes.test.ts`, `tests/unit/reports.test.ts` (both written red,
  confirmed failing, then made green), and `tests/e2e/reporting.spec.ts`.

**Deviation from plan:** for `report-chapter.tsx`, the plan flagged a risk that
`<details><summary>Report chapter</summary></details>` might not expose an accessible
`button` role to Playwright. Rather than try the `<summary>` first and fall back, I went
straight to the plan's suggested fallback — a real `<button type="button">` toggled via
`useState` that swaps to the report `<form>` when clicked. This is simpler, unambiguously
accessible, and avoids a wasted red/green cycle. Behaviorally identical to the spec'd
e2e flow; the e2e test passed on the first run.

All other files match the plan exactly. `npm test` (lint → typecheck → unit → e2e) is
green: 11 unit tests, 5 e2e tests, all passing.
