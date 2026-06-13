# Choose-Your-Own-Adventure Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative branching-story website where signed-in users can start stories, add child chapters, like chapters, and report bad content, while readers discover fresh chapters from a global feed and navigate stories chapter by chapter.

**Architecture:** Start from a fresh Next.js App Router application in TypeScript, keep read surfaces server-rendered, and use server actions plus route handlers for mutations. Persist stories, chapters, likes, reports, and users with Prisma on SQLite for the first release, use Auth.js credentials auth for account-backed writing, and validate chapter content with a narrow rich-text schema that allows paragraphs, bold, and italics but no links.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite, Auth.js, Zod, Tiptap Starter Kit (without links), Vitest, Testing Library, Playwright, ESLint

---

## File Structure Map

- `package.json` - project scripts and dependencies
- `next.config.ts` - Next.js config
- `prisma/schema.prisma` - database schema for users, stories, chapters, likes, and reports
- `prisma/seed.ts` - local seed data for stories and chapters
- `src/app/layout.tsx` - root layout and shared navigation
- `src/app/page.tsx` - recent-chapters homepage
- `src/app/auth/sign-in/page.tsx` - sign-in screen
- `src/app/auth/sign-up/page.tsx` - sign-up screen
- `src/app/stories/new/page.tsx` - start-story flow
- `src/app/stories/[storyId]/page.tsx` - story overview and chapter tree entry point
- `src/app/stories/[storyId]/chapters/[chapterId]/page.tsx` - chapter reader view with choices and like counts
- `src/app/stories/[storyId]/chapters/[chapterId]/new/page.tsx` - add-child-chapter form
- `src/app/admin/reports/page.tsx` - simple report-review page for admins
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js handler
- `src/app/api/chapters/[chapterId]/like/route.ts` - like mutation
- `src/app/api/chapters/[chapterId]/report/route.ts` - report mutation
- `src/components/editor/chapter-editor.tsx` - rich-text chapter editor
- `src/components/chapters/chapter-form.tsx` - shared chapter creation form
- `src/components/chapters/chapter-reader.tsx` - chapter content plus choices
- `src/components/feed/recent-chapter-feed.tsx` - homepage feed rendering
- `src/components/layout/site-header.tsx` - top navigation with auth actions
- `src/lib/auth.ts` - Auth.js config and session helpers
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/chapters.ts` - chapter queries and invariants
- `src/lib/stories.ts` - story queries and recent-feed helpers
- `src/lib/reports.ts` - report query helpers
- `src/lib/rich-text.ts` - Tiptap schema config and server-side validation helpers
- `src/lib/passwords.ts` - password hashing and verification helpers
- `src/actions/auth-actions.ts` - sign-up and sign-in actions
- `src/actions/story-actions.ts` - start-story action
- `src/actions/chapter-actions.ts` - add-child-chapter action
- `src/actions/report-actions.ts` - report submission and admin removal actions
- `src/middleware.ts` - admin route protection
- `src/test/factories.ts` - reusable Prisma test data helpers
- `src/test/setup.ts` - Vitest setup
- `tests/unit/*.test.ts` - domain and validation tests
- `tests/e2e/*.spec.ts` - browser journeys
- `playwright.config.ts` - Playwright configuration
- `vitest.config.ts` - Vitest configuration
- `.env.example` - required environment variables
- `README.md` - local setup and test commands

### Task 1: Bootstrap the application and testing toolchain

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/components/layout/site-header.tsx`
- Create: `playwright.config.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the failing homepage browser test**

```ts
import { expect, test } from '@playwright/test';

test('homepage shows the recent chapters heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent chapters' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a story' })).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test to verify it fails**

Run: `npx playwright test tests/e2e/home.spec.ts --project=chromium`
Expected: FAIL with a missing app or missing route error.

- [ ] **Step 3: Scaffold the Next.js app, scripts, and base layout**

```json
{
  "name": "choose-your-own",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Recent chapters</h1>
      <p>See what readers and writers have added most recently.</p>
      <a href="/stories/new">Start a story</a>
    </main>
  );
}
```

- [ ] **Step 4: Add the shared shell and test config**

```tsx
// src/app/layout.tsx
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
```

```tsx
// src/components/layout/site-header.tsx
export function SiteHeader() {
  return (
    <header>
      <a href="/">Choose Your Own</a>
      <nav>
        <a href="/stories/new">Start a story</a>
        <a href="/auth/sign-in">Sign in</a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 5: Run the homepage browser test to verify it passes**

Run: `npx playwright test tests/e2e/home.spec.ts --project=chromium`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the scaffold**

```bash
git add package.json next.config.ts tsconfig.json playwright.config.ts vitest.config.ts src/app src/components/layout tests/e2e/home.spec.ts src/test/setup.ts
git commit -m "feat: scaffold Next.js storytelling app"
```

### Task 2: Define the database schema and chapter invariants

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/lib/chapters.ts`
- Create: `src/lib/stories.ts`
- Create: `src/test/factories.ts`
- Test: `tests/unit/chapters.test.ts`

- [ ] **Step 1: Write the failing domain test for root and child chapters**

```ts
import { describe, expect, it } from 'vitest';
import { createStoryWithRootChapter, createChildChapter } from '@/lib/chapters';

describe('chapter invariants', () => {
  it('creates a root chapter and a child chapter under exactly one parent', async () => {
    const story = await createStoryWithRootChapter({
      title: 'The Forest Gate',
      authorId: 'user_1',
      chapterTitle: 'At the gate',
      content: [{ type: 'paragraph', children: [{ text: 'You stand before the gate.' }] }]
    });

    const child = await createChildChapter({
      storyId: story.id,
      parentChapterId: story.rootChapterId,
      authorId: 'user_2',
      title: 'Open the gate',
      content: [{ type: 'paragraph', children: [{ text: 'The gate opens.' }] }]
    });

    expect(child.parentChapterId).toBe(story.rootChapterId);
    expect(child.storyId).toBe(story.id);
  });
});
```

- [ ] **Step 2: Run the domain test to verify it fails**

Run: `npm run test:unit -- tests/unit/chapters.test.ts`
Expected: FAIL with missing module or missing exported functions.

- [ ] **Step 3: Add the Prisma schema and client**

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  displayName  String
  passwordHash String
  isAdmin      Boolean       @default(false)
  stories      Story[]
  chapters     Chapter[]
  likes        ChapterLike[]
  reports      ChapterReport[]
}

model Story {
  id            String    @id @default(cuid())
  title         String
  authorId      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  author        User      @relation(fields: [authorId], references: [id])
  chapters      Chapter[]
  rootChapterId String?   @unique
}

model Chapter {
  id              String        @id @default(cuid())
  storyId         String
  parentChapterId String?
  authorId        String
  title           String
  contentJson     Json
  createdAt       DateTime      @default(now())
  deletedAt       DateTime?
  story           Story         @relation(fields: [storyId], references: [id])
  parentChapter   Chapter?      @relation("ChapterChildren", fields: [parentChapterId], references: [id])
  childChapters   Chapter[]     @relation("ChapterChildren")
  author          User          @relation(fields: [authorId], references: [id])
  likes           ChapterLike[]
  reports         ChapterReport[]
}

model ChapterLike {
  id        String   @id @default(cuid())
  chapterId String
  userId    String
  createdAt DateTime @default(now())

  chapter Chapter @relation(fields: [chapterId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([chapterId, userId])
}

model ChapterReport {
  id          String   @id @default(cuid())
  chapterId   String
  userId      String
  reason      String
  resolvedAt  DateTime?
  removedAt   DateTime?
  createdAt   DateTime @default(now())

  chapter Chapter @relation(fields: [chapterId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
}
```

```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 4: Implement the chapter helpers and factories**

```ts
// src/lib/chapters.ts
export async function createStoryWithRootChapter(input: {
  title: string;
  authorId: string;
  chapterTitle: string;
  content: unknown[];
}) {
  return db.$transaction(async (tx) => {
    const story = await tx.story.create({
      data: { title: input.title, authorId: input.authorId }
    });

    const rootChapter = await tx.chapter.create({
      data: {
        storyId: story.id,
        authorId: input.authorId,
        title: input.chapterTitle,
        contentJson: input.content
      }
    });

    await tx.story.update({
      where: { id: story.id },
      data: { rootChapterId: rootChapter.id }
    });

    return { ...story, rootChapterId: rootChapter.id };
  });
}

export async function createChildChapter(input: {
  storyId: string;
  parentChapterId: string;
  authorId: string;
  title: string;
  content: unknown[];
}) {
  const parent = await db.chapter.findUnique({ where: { id: input.parentChapterId } });
  if (!parent || parent.storyId !== input.storyId || parent.deletedAt) throw new Error('Parent chapter not found in story');

  return db.chapter.create({
    data: {
      storyId: input.storyId,
      parentChapterId: input.parentChapterId,
      authorId: input.authorId,
      title: input.title,
      contentJson: input.content
    }
  });
}
```

- [ ] **Step 5: Run the domain test to verify it passes**

Run: `npm run test:unit -- tests/unit/chapters.test.ts`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the schema and chapter model**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/chapters.ts src/lib/stories.ts src/test/factories.ts tests/unit/chapters.test.ts
git commit -m "feat: add story and chapter data model"
```

### Task 3: Add credentials auth and route protection

**Files:**
- Create: `src/lib/passwords.ts`
- Create: `src/lib/auth.ts`
- Create: `src/actions/auth-actions.ts`
- Create: `src/app/auth/sign-in/page.tsx`
- Create: `src/app/auth/sign-up/page.tsx`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/components/layout/site-header.tsx`
- Test: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Write the failing auth browser test**

```ts
import { expect, test } from '@playwright/test';

test('signed-in user can create an account and sees the write navigation', async ({ page }) => {
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Avery');
  await page.getByLabel('Email').fill('avery@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('link', { name: 'Start a story' })).toBeVisible();
  await expect(page.getByText('Signed in as Avery')).toBeVisible();
});
```

- [ ] **Step 2: Run the auth browser test to verify it fails**

Run: `npx playwright test tests/e2e/auth.spec.ts --project=chromium`
Expected: FAIL because the sign-up page does not exist.

- [ ] **Step 3: Implement password helpers and Auth.js config**

```ts
// src/lib/passwords.ts
import bcrypt from 'bcryptjs';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

```ts
// src/lib/auth.ts
export const authOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.displayName, isAdmin: user.isAdmin };
      }
    })
  ]
};

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/sign-in');
  return session;
}

export async function requireAdminUser() {
  const session = await requireUser();
  if (!session.user.isAdmin) redirect('/');
  return session;
}
```

- [ ] **Step 4: Build the sign-up action and pages**

```ts
// src/actions/auth-actions.ts
export async function signUp(formData: FormData) {
  const displayName = String(formData.get('displayName') ?? '');
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { displayName, email, passwordHash } });
  await signIn('credentials', { email, password, redirectTo: '/' });
}

export async function signInWithCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  await signIn('credentials', { email, password, redirectTo: '/' });
}
```

```tsx
// src/app/auth/sign-up/page.tsx
export default function SignUpPage() {
  return (
    <form action={signUp}>
      <label>
        Display name
        <input name="displayName" />
      </label>
      <label>
        Email
        <input name="email" type="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" />
      </label>
      <button type="submit">Create account</button>
    </form>
  );
}
```

```tsx
// src/app/auth/sign-in/page.tsx
export default function SignInPage() {
  return (
    <form action={signInWithCredentials}>
      <label>
        Email
        <input name="email" type="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" />
      </label>
      <button type="submit">Sign in</button>
    </form>
  );
}
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: Update the header to reflect auth state and rerun the browser test**

```tsx
// src/components/layout/site-header.tsx
export async function SiteHeader() {
  const session = await auth();

  return (
    <header>
      <a href="/">Choose Your Own</a>
      <nav>
        <a href="/stories/new">Start a story</a>
        {session?.user ? <span>Signed in as {session.user.name}</span> : <a href="/auth/sign-in">Sign in</a>}
      </nav>
    </header>
  );
}
```

Run: `npx playwright test tests/e2e/auth.spec.ts --project=chromium`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the auth flow**

```bash
git add src/lib/passwords.ts src/lib/auth.ts src/actions/auth-actions.ts src/app/auth src/app/api/auth src/components/layout/site-header.tsx tests/e2e/auth.spec.ts
git commit -m "feat: add account-backed authentication"
```

### Task 4: Add rich-text validation and the shared chapter form

**Files:**
- Create: `src/lib/rich-text.ts`
- Create: `src/components/editor/chapter-editor.tsx`
- Create: `src/components/chapters/chapter-form.tsx`
- Test: `tests/unit/rich-text.test.ts`

- [ ] **Step 1: Write the failing rich-text validation test**

```ts
import { describe, expect, it } from 'vitest';
import { validateChapterContent } from '@/lib/rich-text';

describe('validateChapterContent', () => {
  it('rejects link marks and accepts bold and italic text', () => {
    expect(() =>
      validateChapterContent([
        { type: 'paragraph', children: [{ text: 'Safe ', bold: true }, { text: 'text', italic: true }] }
      ])
    ).not.toThrow();

    expect(() =>
      validateChapterContent([
        { type: 'paragraph', children: [{ text: 'Bad link', link: 'https://example.com' }] }
      ])
    ).toThrow('Links are not allowed');
  });
});
```

- [ ] **Step 2: Run the validation test to verify it fails**

Run: `npm run test:unit -- tests/unit/rich-text.test.ts`
Expected: FAIL with missing validator function.

- [ ] **Step 3: Implement the content validator and editor config**

```ts
// src/lib/rich-text.ts
import { z } from 'zod';

const textNodeSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  link: z.string().optional()
});

const paragraphSchema = z.object({
  type: z.literal('paragraph'),
  children: z.array(textNodeSchema)
});

export function validateChapterContent(input: unknown) {
  const content = z.array(paragraphSchema).parse(input);
  for (const paragraph of content) {
    for (const child of paragraph.children) {
      if (child.link) throw new Error('Links are not allowed');
    }
  }
  return content;
}
```

```tsx
// src/components/editor/chapter-editor.tsx
'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function ChapterEditor({ inputId, inputName, initialJson }: { inputId: string; inputName: string; initialJson: unknown[] }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ bulletList: false, orderedList: false, codeBlock: false, blockquote: false })],
    content: { type: 'doc', content: initialJson }
  });

  useEffect(() => {
    if (!editor) return;

    const sync = () => {
      const hidden = document.getElementById(inputId) as HTMLInputElement | null;
      if (hidden) hidden.value = JSON.stringify(editor.getJSON().content ?? []);
    };

    sync();
    editor.on('update', sync);
    return () => editor.off('update', sync);
  }, [editor, inputId]);

  return (
    <div>
      <EditorContent editor={editor} />
      <input id={inputId} name={inputName} type="hidden" defaultValue={JSON.stringify(initialJson)} />
    </div>
  );
}
```

- [ ] **Step 4: Build the shared chapter form wrapper**

```tsx
// src/components/chapters/chapter-form.tsx
import { ChapterEditor } from '@/components/editor/chapter-editor';

export function ChapterForm({
  action,
  submitLabel,
  includeStoryTitle = false
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  includeStoryTitle?: boolean;
}) {
  return (
    <form action={action}>
      {includeStoryTitle ? (
        <label>
          Story title
          <input name="storyTitle" />
        </label>
      ) : null}
      <label>
        Chapter title
        <input name="title" />
      </label>
      <ChapterEditor
        inputId="content"
        inputName="content"
        initialJson={[{ type: 'paragraph', children: [{ text: '' }] }]}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
```

- [ ] **Step 5: Run the validation test to verify it passes**

Run: `npm run test:unit -- tests/unit/rich-text.test.ts`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the shared editor layer**

```bash
git add src/lib/rich-text.ts src/components/editor/chapter-editor.tsx src/components/chapters/chapter-form.tsx tests/unit/rich-text.test.ts
git commit -m "feat: add chapter content validation"
```

### Task 5: Implement story creation and child-chapter creation

**Files:**
- Create: `src/actions/story-actions.ts`
- Create: `src/actions/chapter-actions.ts`
- Create: `src/app/stories/new/page.tsx`
- Create: `src/app/stories/[storyId]/chapters/[chapterId]/new/page.tsx`
- Modify: `src/lib/chapters.ts`
- Test: `tests/e2e/chapter-creation.spec.ts`

- [ ] **Step 1: Write the failing browser test for starting a story and adding a child chapter**

```ts
import { expect, test } from '@playwright/test';

test('signed-in user can start a story and add a child chapter', async ({ page }) => {
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill('The Clocktower');
  await page.getByLabel('Chapter title').fill('The bell rings');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  await expect(page.getByRole('heading', { name: 'The bell rings' })).toBeVisible();

  await page.getByRole('link', { name: 'Add a chapter' }).click();
  await page.getByLabel('Chapter title').fill('Climb the stairs');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  await expect(page.getByRole('link', { name: 'Climb the stairs' })).toBeVisible();
});
```

- [ ] **Step 2: Run the creation browser test to verify it fails**

Run: `npx playwright test tests/e2e/chapter-creation.spec.ts --project=chromium`
Expected: FAIL because the story and chapter creation pages do not exist.

- [ ] **Step 3: Implement the story creation action and page**

```ts
// src/actions/story-actions.ts
export async function createStory(formData: FormData) {
  const session = await requireUser();
  const title = String(formData.get('storyTitle') ?? '');
  const chapterTitle = String(formData.get('title') ?? '');
  const content = validateChapterContent(JSON.parse(String(formData.get('content') ?? '[]')));

  const story = await createStoryWithRootChapter({
    title,
    authorId: session.user.id,
    chapterTitle,
    content
  });

  redirect(`/stories/${story.id}/chapters/${story.rootChapterId}`);
}
```

```tsx
// src/app/stories/new/page.tsx
export default function NewStoryPage() {
  return <ChapterForm action={createStory} submitLabel="Publish first chapter" includeStoryTitle />;
}
```

- [ ] **Step 4: Implement child-chapter creation and chapter listing**

```ts
// src/actions/chapter-actions.ts
export async function createChildChapterAction(parentChapterId: string, storyId: string, formData: FormData) {
  const session = await requireUser();
  const title = String(formData.get('title') ?? '');
  const content = validateChapterContent(JSON.parse(String(formData.get('content') ?? '[]')));

  await createChildChapter({
    storyId,
    parentChapterId,
    authorId: session.user.id,
    title,
    content
  });

  redirect(`/stories/${storyId}/chapters/${parentChapterId}`);
}
```

```tsx
// src/app/stories/[storyId]/chapters/[chapterId]/new/page.tsx
export default function NewChildChapterPage({ params }: { params: { storyId: string; chapterId: string } }) {
  const action = createChildChapterAction.bind(null, params.chapterId, params.storyId);
  return <ChapterForm action={action} submitLabel="Publish chapter" />;
}
```

```ts
// src/lib/chapters.ts
export async function getChapterWithChoices(chapterId: string) {
  return db.chapter.findFirst({
    where: { id: chapterId, deletedAt: null },
    include: {
      childChapters: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { likes: true }
      }
    }
  });
}
```

- [ ] **Step 5: Run the creation browser test to verify it passes**

Run: `npx playwright test tests/e2e/chapter-creation.spec.ts --project=chromium`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the writing flow**

```bash
git add src/actions/story-actions.ts src/actions/chapter-actions.ts src/app/stories/new src/app/stories src/lib/chapters.ts tests/e2e/chapter-creation.spec.ts
git commit -m "feat: add story and chapter creation flows"
```

### Task 6: Build the homepage feed and chapter reader

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/stories/[storyId]/page.tsx`
- Create: `src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`
- Create: `src/components/feed/recent-chapter-feed.tsx`
- Create: `src/components/chapters/chapter-reader.tsx`
- Modify: `src/lib/stories.ts`
- Modify: `src/lib/chapters.ts`
- Test: `tests/e2e/reading.spec.ts`

- [ ] **Step 1: Write the failing browser test for the chapter reading flow**

```ts
import { expect, test } from '@playwright/test';

test('reader sees choices with like counts at the end of a chapter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'The bell rings' }).click();

  await expect(page.getByRole('heading', { name: 'The bell rings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Climb the stairs' })).toBeVisible();
  await expect(page.getByText('0 likes')).toBeVisible();
});
```

- [ ] **Step 2: Run the reading browser test to verify it fails**

Run: `npx playwright test tests/e2e/reading.spec.ts --project=chromium`
Expected: FAIL because the feed and chapter reader do not render real data yet.

- [ ] **Step 3: Implement the recent-chapters feed query and homepage**

```ts
// src/lib/stories.ts
export async function listRecentChapters() {
  return db.chapter.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { story: true, likes: true }
  });
}
```

```tsx
// src/components/feed/recent-chapter-feed.tsx
export function RecentChapterFeed({
  chapters
}: {
  chapters: Array<{ id: string; storyId: string; title: string; story: { title: string } }>;
}) {
  return (
    <main>
      <h1>Recent chapters</h1>
      {chapters.map((chapter) => (
        <article key={chapter.id}>
          <a href={`/stories/${chapter.storyId}/chapters/${chapter.id}`}>{chapter.title}</a>
          <p>From {chapter.story.title}</p>
        </article>
      ))}
    </main>
  );
}
```

```tsx
// src/app/page.tsx
export default async function HomePage() {
  const chapters = await listRecentChapters();
  return <RecentChapterFeed chapters={chapters} />;
}
```

- [ ] **Step 4: Implement the chapter reader view**

```tsx
// src/components/chapters/chapter-reader.tsx
export function ChapterReader({
  chapter
}: {
  chapter: {
    id: string;
    title: string;
    storyId: string;
    contentJson: Array<{ id?: string; children: Array<{ text: string }> }>;
    childChapters: Array<{ id: string; title: string; likes: Array<{ id: string }> }>;
  };
}) {
  return (
    <article>
      <h1>{chapter.title}</h1>
      <div>
        {chapter.contentJson.map((node) => (
          <p key={node.id ?? JSON.stringify(node)}>
            {node.children.map((child) => child.text).join('')}
          </p>
        ))}
      </div>
      <section aria-label="Choices">
        {chapter.childChapters.map((choice) => (
          <div key={choice.id}>
            <a href={`/stories/${chapter.storyId}/chapters/${choice.id}`}>{choice.title}</a>
            <span>{choice.likes.length} likes</span>
          </div>
        ))}
      </section>
    </article>
  );
}
```

```tsx
// src/app/stories/[storyId]/page.tsx
export default async function StoryPage({ params }: { params: { storyId: string } }) {
  const story = await db.story.findUnique({
    where: { id: params.storyId },
    include: { chapters: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } }
  });

  if (!story) notFound();

  return (
    <main>
      <h1>{story.title}</h1>
      <ul>
        {story.chapters.map((chapter) => (
          <li key={chapter.id}>
            <a href={`/stories/${story.id}/chapters/${chapter.id}`}>{chapter.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

```tsx
// src/app/stories/[storyId]/chapters/[chapterId]/page.tsx
export default async function ChapterPage({ params }: { params: { storyId: string; chapterId: string } }) {
  const chapter = await getChapterWithChoices(params.chapterId);
  if (!chapter) notFound();
  return <ChapterReader chapter={chapter} />;
}
```

- [ ] **Step 5: Run the reading browser test to verify it passes**

Run: `npx playwright test tests/e2e/reading.spec.ts --project=chromium`
Expected: PASS with 1 passed test.

- [ ] **Step 6: Commit the read surfaces**

```bash
git add src/app/page.tsx src/app/stories/[storyId] src/components/feed/recent-chapter-feed.tsx src/components/chapters/chapter-reader.tsx src/lib/stories.ts src/lib/chapters.ts tests/e2e/reading.spec.ts
git commit -m "feat: add recent feed and chapter reader"
```

### Task 7: Add likes, reports, and the minimal admin surface

**Files:**
- Create: `src/app/api/chapters/[chapterId]/like/route.ts`
- Create: `src/app/api/chapters/[chapterId]/report/route.ts`
- Create: `src/actions/report-actions.ts`
- Create: `src/lib/reports.ts`
- Create: `src/app/admin/reports/page.tsx`
- Create: `src/middleware.ts`
- Test: `tests/unit/likes.test.ts`
- Test: `tests/e2e/reporting.spec.ts`

- [ ] **Step 1: Write the failing duplicate-like unit test**

```ts
import { describe, expect, it } from 'vitest';
import { likeChapter } from '@/lib/chapters';

describe('likeChapter', () => {
  it('allows one like per user per chapter', async () => {
    await likeChapter({ chapterId: 'chapter_1', userId: 'user_1' });
    await expect(likeChapter({ chapterId: 'chapter_1', userId: 'user_1' })).rejects.toThrow('already liked');
  });
});
```

- [ ] **Step 2: Run the like unit test to verify it fails**

Run: `npm run test:unit -- tests/unit/likes.test.ts`
Expected: FAIL with missing like helper.

- [ ] **Step 3: Implement likes and report submission**

```ts
// src/lib/chapters.ts
import { Prisma } from '@prisma/client';

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
```

```ts
// src/app/api/chapters/[chapterId]/like/route.ts
export async function POST(_: Request, { params }: { params: { chapterId: string } }) {
  const session = await requireUser();
  await likeChapter({ chapterId: params.chapterId, userId: session.user.id });
  return Response.json({ ok: true });
}
```

```ts
// src/app/api/chapters/[chapterId]/report/route.ts
export async function POST(request: Request, { params }: { params: { chapterId: string } }) {
  const session = await requireUser();
  const { reason } = await request.json();
  await db.chapterReport.create({
    data: { chapterId: params.chapterId, userId: session.user.id, reason }
  });
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Add the admin reports page and route protection**

```ts
// src/middleware.ts
export default auth((request) => {
  if (request.nextUrl.pathname.startsWith('/admin') && !request.auth?.user?.isAdmin) {
    return Response.redirect(new URL('/', request.nextUrl));
  }
});
```

```tsx
// src/app/admin/reports/page.tsx
export default async function ReportsPage() {
  const reports = await listOpenReports();
  return (
    <main>
      <h1>Open reports</h1>
      {reports.map((report) => (
        <article key={report.id}>
          <h2>{report.chapter.title}</h2>
          <p>{report.reason}</p>
        </article>
      ))}
    </main>
  );
}
```

```ts
// src/lib/reports.ts
export function listOpenReports() {
  return db.chapterReport.findMany({
    where: { removedAt: null, resolvedAt: null },
    include: { chapter: true, user: true },
    orderBy: { createdAt: 'asc' }
  });
}
```

```ts
// src/actions/report-actions.ts
export async function removeReportedChapter(reportId: string) {
  const session = await requireAdminUser();
  await db.$transaction(async (tx) => {
    const report = await tx.chapterReport.findUniqueOrThrow({ where: { id: reportId } });
    await tx.chapter.update({ where: { id: report.chapterId }, data: { deletedAt: new Date() } });
    await tx.chapterReport.update({
      where: { id: reportId },
      data: { removedAt: new Date(), resolvedAt: new Date() }
    });
  });
  redirect('/admin/reports');
}
```

- [ ] **Step 5: Add the report browser test and rerun both suites**

```ts
import { expect, test } from '@playwright/test';

test('signed-in reader can report a chapter', async ({ page }) => {
  await page.goto('/stories/story_1/chapters/chapter_1');
  await page.getByRole('button', { name: 'Report chapter' }).click();
  await page.getByLabel('Reason').fill('Spam content');
  await page.getByRole('button', { name: 'Submit report' }).click();

  await expect(page.getByText('Report submitted')).toBeVisible();
});
```

Run: `npm run test:unit -- tests/unit/likes.test.ts && npx playwright test tests/e2e/reporting.spec.ts --project=chromium`
Expected: PASS with the like unit test and the reporting browser test both green.

- [ ] **Step 6: Commit likes and moderation basics**

```bash
git add src/app/api/chapters src/actions/report-actions.ts src/lib/reports.ts src/app/admin/reports/page.tsx src/middleware.ts tests/unit/likes.test.ts tests/e2e/reporting.spec.ts src/lib/chapters.ts
git commit -m "feat: add chapter likes and reporting"
```

### Task 8: Finish end-to-end coverage, docs, and local developer setup

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Create: `prisma/seed.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Test: `tests/e2e/full-journey.spec.ts`

- [ ] **Step 1: Write the failing full-journey browser test**

```ts
import { expect, test } from '@playwright/test';

test('user can sign up, start a story, add a branch, and see it in the feed', async ({ page }) => {
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Morgan');
  await page.getByLabel('Email').fill('morgan@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill('The Lantern Door');
  await page.getByLabel('Chapter title').fill('A knock at midnight');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  await page.getByRole('link', { name: 'Add a chapter' }).click();
  await page.getByLabel('Chapter title').fill('Answer the door');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Answer the door' })).toBeVisible();
});
```

- [ ] **Step 2: Run the full-journey browser test to verify it fails**

Run: `npx playwright test tests/e2e/full-journey.spec.ts --project=chromium`
Expected: FAIL until the missing navigation and seeded state issues are fixed.

- [ ] **Step 3: Add seed data, environment examples, and the remaining polish**

```env
# .env.example
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
```

```ts
// prisma/seed.ts
await db.user.create({
  data: {
    email: 'admin@example.com',
    displayName: 'Admin',
    passwordHash: await hashPassword('password123'),
    isAdmin: true
  }
});
```

```md
# Choose Your Own

## Local setup

1. `npm install`
2. `cp .env.example .env`
3. `npx prisma migrate dev`
4. `npm run dev`

## Tests

- `npm run lint`
- `npm run test:unit`
- `npm run test:e2e`
```

- [ ] **Step 4: Run the complete validation set**

Run: `npm run lint && npm run test:unit && npx prisma migrate dev && npx playwright test`
Expected: PASS with lint, unit tests, migrations, and browser tests all green.

- [ ] **Step 5: Commit the final MVP wiring**

```bash
git add .env.example README.md prisma/seed.ts playwright.config.ts package.json tests/e2e/full-journey.spec.ts
git commit -m "feat: finish collaborative story MVP"
```

## Self-Review

- **Spec coverage:** The plan covers account-backed writing, recent-chapter discovery, chapter-by-chapter reading, visible like counts on child choices, immediate publication, reporting/admin removal, and browser-first testing. Draft autosave, links in content, and contribution gating remain intentionally out of scope.
- **Placeholder scan:** The plan includes exact file paths, commands, and example code for each task. There are no `TODO`, `TBD`, or "similar to above" placeholders.
- **Type consistency:** Stories, chapters, likes, and reports use consistent names across the schema, helpers, pages, and tests. Child chapters remain ordered by `createdAt ASC`, matching the approved spec.
