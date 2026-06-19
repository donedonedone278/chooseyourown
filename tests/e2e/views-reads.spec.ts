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
  await expect(main.getByText('0 views')).toBeVisible();
  await page.reload();
  await expect(main.getByText('0 views')).toBeVisible();

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
  await expect(mainA.getByText('1 view', { exact: true })).toBeVisible();

  // Reload by the same reader stays idempotent — still 1 view.
  await pageA.reload();
  await expect(mainA.getByText('1 view', { exact: true })).toBeVisible();

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
  await expect(mainB.getByText('2 views')).toBeVisible();

  // After reading, the chapter shows as read in Bailey's feed on revisit.
  await pageB.goto('/');
  await expect(pageB.locator('main').getByText(`Read · from Viewed Story ${stamp}`)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
