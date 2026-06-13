# Task 8 — Full-journey e2e, seed data, docs, and local setup

> Rewritten from `docs/superpowers/plans/2026-06-12-choose-your-own-adventure.md` (Task 8)
> to match the **actual** project: no Prisma migrations (schema is synced via
> `prisma db push`), Markdown chapter content, server actions, and the
> like/report/admin surfaces landed in Task 7 (commit `eb9c7a3`). Work test-first
> where the plan calls for it; run `npm test` before committing.

## Context

Tasks 1–7 are done: scaffold, data model, auth, content validation, writing flow,
reader + feed, and likes/reports/admin removal. What's left per the master plan and
`CLAUDE.md`'s "Still to build" note is the wrap-up: a true end-to-end journey test that
exercises the whole loop *including* admin moderation (Task 7 explicitly deferred this —
sign-up only creates non-admin users, so there was previously no way to reach
`/admin/reports` in a browser test), plus the local-setup artifacts a fresh clone needs:
`.env.example`, `README.md`, and `prisma/seed.ts`.

## Design decisions (read before coding)

1. **No Prisma migrations.** The original plan's Step 4 ran `npx prisma migrate dev`.
   This project has no `prisma/migrations/` directory — schema sync is `npx prisma db push`
   (see `src/test/global-setup.ts` and `CLAUDE.md`'s first-time setup). README and any
   commands here use `db push`, not `migrate dev`.

2. **Seed admin via `tsx`.** `prisma/seed.ts` will be TypeScript (to reuse
   `hashPassword` from `src/lib/passwords.ts` and `db` from `src/lib/db.ts`, keeping
   hashing logic in one place). Prisma's seed runner needs a TS executor — add `tsx` as a
   devDependency and wire `"prisma": { "seed": "tsx prisma/seed.ts" }` in `package.json`.
   Document `npx prisma db seed` in the README. The seed is **idempotent**
   (`db.user.upsert` on email) so it's safe to re-run.

3. **Admin e2e via in-test seeding (per your answer).** `tests/e2e/full-journey.spec.ts`
   creates its own admin user directly in the dev db using `createUser` (from
   `src/test/factories.ts`) + `hashPassword` (from `src/lib/passwords.ts`), with a
   per-run-unique email so repeat runs don't collide — same "unique inputs per run"
   convention as the other specs. This is self-contained and doesn't depend on
   `prisma/seed.ts` having been run. Import via the `@/*` path alias, consistent with the
   rest of the app — Playwright 1.54 resolves `tsconfig.json` `paths` automatically; if
   that turns out not to work, fall back to relative imports
   (`../../src/test/factories`, `../../src/lib/passwords`).

4. **One comprehensive spec, not a near-duplicate of Task 5/6's tests.**
   `chapter-creation.spec.ts` and `reading.spec.ts` already cover "sign up → start story →
   add child chapter → appears in feed/reader with like counts". Re-asserting that exact
   path in `full-journey.spec.ts` would be redundant. Instead, `full-journey.spec.ts`
   covers the **moderation loop** that nothing else tests: publish → another user reports
   it → admin sees it in `/admin/reports` → admin removes it → it disappears from the
   reader's choice list and the homepage feed. This directly closes the gap Task 7 called
   out and matches the design spec's "admins can review reports and remove content later".

5. **`playwright.config.ts`**: no change needed. The existing `webServer` + baseURL config
   already supports a longer spec; use `test.setTimeout(...)` inside the spec file itself
   if the multi-account flow needs more than the default timeout, rather than a global
   config change.

---

## Step 1 — `.env.example`

Create at repo root:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
```
Matches the two env vars `CLAUDE.md` documents as required (`DATABASE_URL`, `AUTH_SECRET`).

---

## Step 2 — `prisma/seed.ts` + wiring

### 2a. Add `tsx` and configure the seed runner
In `package.json`:
- add `"tsx": "^4"` to `devDependencies` (run `npm install -D tsx`)
- add a top-level `"prisma": { "seed": "tsx prisma/seed.ts" }` block
- add a convenience script: `"db:seed": "prisma db seed"`

### 2b. `prisma/seed.ts`
```ts
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

async function main() {
  const passwordHash = await hashPassword('password123');

  await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      displayName: 'Admin',
      passwordHash,
      isAdmin: true
    }
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
```
> Verify `tsx` resolves the `@/*` path alias when invoked via `prisma db seed` (it reads
> `tsconfig.json` by default). If it doesn't, switch the imports to relative paths
> (`../src/lib/db`, `../src/lib/passwords`) — keep whichever actually runs.

### 2c. Manual check
```bash
npx prisma db seed
```
Expect it to complete without error and upsert `admin@example.com` (`isAdmin: true`,
password `password123`) into `dev.db`.

---

## Step 3 — Full-journey e2e test (`tests/e2e/full-journey.spec.ts`, new)

Follow existing spec conventions: scope queries to `header`/`main`/`nav`, unique emails
via `Date.now()`, `getByLabel`/`getByRole`. Reuse the create-story / add-chapter steps
from `chapter-creation.spec.ts` only as setup (not as the thing under test).

```ts
import { expect, test } from '@playwright/test';
import { createUser } from '@/test/factories';
import { hashPassword } from '@/lib/passwords';

test('admin can remove a reported chapter end-to-end', async ({ page }) => {
  const stamp = Date.now();

  // 1. Writer publishes a story and a child chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Casey');
  await page.getByLabel('Email').fill(`casey-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Casey')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Reported Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Root ${stamp}`);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  await page.locator('main').getByRole('link', { name: 'Add a chapter' }).click();
  const childTitle = `Flagged Chapter ${stamp}`;
  await page.getByLabel('Chapter title').fill(childTitle);
  await page.getByLabel('Chapter content').fill('Content that gets reported.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();
  await page.locator('main').getByRole('link', { name: childTitle }).click();
  await expect(page.getByRole('heading', { name: childTitle })).toBeVisible();
  const chapterUrl = page.url();

  // 2. A second signed-in reader reports it.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley');
  await page.getByLabel('Email').fill(`riley-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley')).toBeVisible();

  await page.goto(chapterUrl);
  await page.getByRole('button', { name: 'Report chapter' }).click();
  await page.getByLabel('Reason').fill('Inappropriate content');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Report submitted')).toBeVisible();

  // 3. An admin signs in, sees the report, and removes the chapter.
  const adminEmail = `admin-${stamp}@example.com`;
  await createUser({
    email: adminEmail,
    displayName: 'Moderator',
    passwordHash: await hashPassword('password123'),
    isAdmin: true
  });

  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as Moderator')).toBeVisible();

  await page.locator('nav').getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Open reports' })).toBeVisible();
  await expect(page.locator('main').getByRole('heading', { name: childTitle })).toBeVisible();

  await page
    .locator('main')
    .getByRole('listitem')
    .filter({ hasText: childTitle })
    .getByRole('button', { name: 'Remove chapter' })
    .click();

  // 4. The removed chapter is gone from the open-reports list, the parent's
  //    choices, and the homepage feed.
  await expect(page.getByRole('heading', { name: 'Open reports' })).toBeVisible();
  await expect(page.locator('main').getByRole('heading', { name: childTitle })).toHaveCount(0);

  await page.goto('/');
  await expect(page.locator('main').getByRole('link', { name: childTitle })).toHaveCount(0);
});
```

Notes while implementing:
- Confirm the exact accessible names from Task 7's implementation: the admin page's
  "Remove chapter" button, the `Reports` nav link text, and `Open reports` heading —
  check `src/app/admin/reports/page.tsx` and `src/components/layout/site-header.tsx`
  (written in commit `eb9c7a3`) and adjust selectors if they differ from the snippet above.
- After removal, the chapter is soft-deleted (`deletedAt` set) — `getChapterWithChoices`
  and the feed query both filter `deletedAt: null`, so it should vanish from both without
  extra work. If the parent reader page is still showing a stale choice list, that's a
  `revalidatePath`/redirect gap worth checking in `removeReportedChapterAction`.

Run: `npx playwright test tests/e2e/full-journey.spec.ts --project=chromium` until green.

---

## Step 4 — `README.md` (new)

Cover, in this order, mirroring `CLAUDE.md` so the two stay consistent:
1. One-paragraph description (from `CLAUDE.md`'s "What this repo is").
2. **Local setup** — Volta install, `npm install`, `.env` creation (point at
   `.env.example`), `npx prisma db push`, `npx prisma db seed` (seeded admin login:
   `admin@example.com` / `password123`), `npx playwright install chromium`.
3. **Commands** — `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`,
   `npm run test:unit`, `npm run test:e2e`, `npm test`.
4. **Architecture** — brief: Next.js App Router + Prisma/SQLite, Markdown chapter
   content (`src/lib/rich-text.ts`), server actions for writes, soft-deletion for
   moderation.
5. **Testing tiers** — the node/jsdom/Playwright split from `CLAUDE.md`.

Keep it short — this is an entry point that links to `CLAUDE.md` / `docs/superpowers/`
for depth, not a duplicate of them.

---

## Step 5 — Full gate + commit

```bash
npm test   # lint → typecheck → unit → e2e (fail-fast)
```
If green:
```bash
git add .env.example README.md prisma/seed.ts package.json package-lock.json \
        tests/e2e/full-journey.spec.ts
git commit -m "feat: add full-journey e2e coverage, seed data, and local setup docs"
git push   # standing authorization for develop
```

---

## File checklist

**New**
- [ ] `.env.example`
- [ ] `README.md`
- [ ] `prisma/seed.ts`
- [ ] `tests/e2e/full-journey.spec.ts`

**Modified**
- [ ] `package.json` — `tsx` devDependency, `prisma.seed` config, `db:seed` script

**Deliberately unchanged** (divergence from original plan, see Design decisions)
- `playwright.config.ts` — no change needed
- No `prisma/migrations/` — `db push` stays the schema-sync mechanism

## Review (fill in after implementation)

All steps implemented exactly per the plan, no deviations needed:

- **`.env.example`**: created with `DATABASE_URL` and `AUTH_SECRET` placeholders as specified.
- **`prisma/seed.ts`**: written using the `@/*` path alias as in the plan's primary
  option — `tsx prisma/seed.ts` resolved `@/lib/db` and `@/lib/passwords` correctly via
  `tsconfig.json` paths, so no fallback to relative imports was needed. Wired
  `"prisma": { "seed": "tsx prisma/seed.ts" }` and `"db:seed": "prisma db seed"` into
  `package.json`; `tsx` (^4.22.4) added as a devDependency via `npm install -D tsx`.
  `npx prisma db seed` runs cleanly and idempotently (verified by running it twice,
  upserting `admin@example.com` / `password123`, `isAdmin: true`). Prisma emits a
  deprecation warning about `package.json#prisma` config moving to `prisma.config.ts`
  in Prisma 7 — informational only, not a failure, left as-is.
- **`tests/e2e/full-journey.spec.ts`**: written verbatim from the plan's snippet. Cross-checked
  selectors against `src/app/admin/reports/page.tsx` (heading "Open reports", per-report
  `<h2>` with chapter title, "Remove chapter" / "Dismiss" buttons inside `<li>`s) and
  `src/components/layout/site-header.tsx` ("Reports" nav link for admins, "Signed in as
  {name}" text) — all matched the plan's assumptions exactly, so no selector adjustments
  were required. Used the `@/test/factories` and `@/lib/passwords` imports as-is; both
  resolved fine under Playwright 1.54. Test passed on the first run.
- **`README.md`**: written per the outline — description, local setup (Volta, `.env`,
  `db push`, `db seed`, Playwright browser install), commands, architecture, and the
  testing-tiers table — pointing to `CLAUDE.md` / `docs/superpowers/` for depth.
- **Full gate**: `npm test` (lint → typecheck → unit (5 files, 11 tests) → e2e (6 specs,
  including the new full-journey spec)) passed completely green.
