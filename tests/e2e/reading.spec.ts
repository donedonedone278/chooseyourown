import { expect, test } from '@playwright/test';

test('a published chapter surfaces in the feed and choices show like counts', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Feed Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;
  const childTitle = `Choice ${stamp}`;

  // Sign up (writing is auth-gated).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Sam');
  await page.getByLabel('Email').fill(`sam-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Sam')).toBeVisible();

  // Publish a story, then a child chapter under its root.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();

  await page.locator('main').getByRole('link', { name: 'Add a chapter' }).click();
  await page.getByLabel('Chapter title').fill(childTitle);
  await page.getByLabel('Chapter content').fill('A branch.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // Back on the root reader: the choice shows with its (zero) like count.
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: childTitle })).toBeVisible();
  await expect(page.locator('main').getByText('0 likes')).toBeVisible();

  // The homepage feed surfaces the freshly published chapter.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent chapters' })).toBeVisible();
  await page.locator('main').getByRole('link', { name: rootTitle, exact: true }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
});
