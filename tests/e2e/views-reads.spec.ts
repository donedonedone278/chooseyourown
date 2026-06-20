import { expect, test } from '@playwright/test';

test('views increment per unique viewer (author excluded, idempotent on reload) and reads mark the feed', async ({
  page,
  browser
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Author publishes a chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley');
  await page.getByLabel('Email').fill(`riley-views-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Viewed Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('A chapter worth viewing.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Chapter ${stamp}` })).toBeVisible();
  const url = page.url();
  const main = page.locator('main');

  // Author viewing their own chapter does not bump the count.
  await expect(main.getByLabel('0 views')).toBeVisible();
  await page.reload();
  await expect(main.getByLabel('0 views')).toBeVisible();

  // Reader A opens the chapter — 1 view.
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto('/auth/sign-up');
  await pageA.getByLabel('Display name').fill('Avery');
  await pageA.getByLabel('Email').fill(`avery-views-${stamp}@example.com`);
  await pageA.getByLabel('Password').fill('password123');
  await pageA.getByRole('button', { name: 'Create account' }).click();
  await expect(pageA.getByText('Signed in as Avery')).toBeVisible();

  await pageA.goto(url);
  const mainA = pageA.locator('main');
  await expect(mainA.getByLabel('1 view', { exact: true })).toBeVisible();

  // Reload by the same reader stays idempotent — still 1 view.
  await pageA.reload();
  await expect(mainA.getByLabel('1 view', { exact: true })).toBeVisible();

  // Reader B opens the chapter — 2 views.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto('/auth/sign-up');
  await pageB.getByLabel('Display name').fill('Bailey');
  await pageB.getByLabel('Email').fill(`bailey-views-${stamp}@example.com`);
  await pageB.getByLabel('Password').fill('password123');
  await pageB.getByRole('button', { name: 'Create account' }).click();
  await expect(pageB.getByText('Signed in as Bailey')).toBeVisible();

  await pageB.goto(url);
  const mainB = pageB.locator('main');
  await expect(mainB.getByLabel('2 views')).toBeVisible();

  // After reading, the chapter shows as read in Bailey's feed on revisit
  // (visual: the card carries the read marker rather than the literal "Read" text).
  await pageB.goto('/');
  await expect(
    pageB.locator('main li[data-read="true"]').filter({ hasText: `Viewed Story ${stamp}` })
  ).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test('opening a chapter from the feed then pressing Back marks it read without a manual refresh', async ({
  page,
  browser
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Author publishes a chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Quincy');
  await page.getByLabel('Email').fill(`quincy-back-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Quincy')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Back Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Back Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('A chapter to read and return from.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Back Chapter ${stamp}` })).toBeVisible();

  // A different signed-in reader who has NOT read it opens the feed.
  const context = await browser.newContext();
  const reader = await context.newPage();
  await reader.goto('/auth/sign-up');
  await reader.getByLabel('Display name').fill('Quinn');
  await reader.getByLabel('Email').fill(`quinn-back-${stamp}@example.com`);
  await reader.getByLabel('Password').fill('password123');
  await reader.getByRole('button', { name: 'Create account' }).click();
  await expect(reader.getByText('Signed in as Quinn')).toBeVisible();

  await reader.goto('/');
  const card = reader.locator('main li').filter({ hasText: `Back Story ${stamp}` });
  await expect(card).not.toHaveAttribute('data-read', 'true');

  // Open the chapter via the feed link (Next.js soft navigation), then press Back.
  await card.getByRole('link', { name: `Back Chapter ${stamp}` }).click();
  await expect(reader.getByRole('heading', { name: `Back Chapter ${stamp}` })).toBeVisible();
  await reader.goBack();

  // Back on the feed (no reload): the card now shows as read via the local overlay.
  await expect(card).toHaveAttribute('data-read', 'true');

  await context.close();
});

test('a logged-out visitor can open a chapter without a deviceId cookie yet, view count increments, and the read mark persists locally', async ({
  page,
  browser
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Author publishes a chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Jordan');
  await page.getByLabel('Email').fill(`jordan-anon-views-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Jordan')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Anon Viewed Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Anon Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('A chapter worth viewing anonymously.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Anon Chapter ${stamp}` })).toBeVisible();
  const url = page.url();

  // A brand-new, cookieless browser context (no deviceId cookie yet) opens the
  // chapter. This previously 500'd: the chapter page's server render called
  // `cookies().set()` to mint the deviceId, which Next.js forbids outside a
  // Server Action / Route Handler.
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  const response = await anonPage.goto(url);
  expect(response?.status()).toBe(200);

  const anonMain = anonPage.locator('main');
  await expect(anonMain.getByLabel('1 view', { exact: true })).toBeVisible();

  // Same anonymous context reloading stays idempotent — still 1 view.
  await anonPage.reload();
  await expect(anonMain.getByLabel('1 view', { exact: true })).toBeVisible();

  // After opening, the chapter shows as read in this context's feed
  // (logged-out localStorage path via MarkChapterRead / useLocalReadIds);
  // visual marker on the card rather than the literal "Read" text.
  await anonPage.goto('/');
  await expect(
    anonPage.locator('main li[data-read="true"]').filter({ hasText: `Anon Viewed Story ${stamp}` })
  ).toBeVisible();

  await anonContext.close();
});
