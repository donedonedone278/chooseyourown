import { expect, test } from '@playwright/test';

test('story cover page shows stats and links to the root chapter', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Cover Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;

  // Sign up (writing is auth-gated).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Nora');
  await page.getByLabel('Handle').fill(`nora-${Math.random().toString(36).slice(2, 8)}`);
  await page.getByLabel('Email').fill(`nora-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Nora')).toBeVisible();

  // Publish a story (root chapter).
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();

  // From the reader, follow the breadcrumb to the story cover page.
  await page.locator('main').getByRole('link', { name: storyTitle }).click();
  await expect(page.locator('main').getByRole('heading', { name: storyTitle })).toBeVisible();
  const beginLink = page.locator('main').getByRole('link', { name: 'Begin the story' });
  await expect(beginLink).toBeVisible();

  // Following "Begin the story" lands on the root chapter.
  await beginLink.click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
});
