import { expect, test } from '@playwright/test';

test('a published chapter surfaces in the feed and choices show like counts', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Feed Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;
  const childTitle = `Choice ${stamp}`;
  const grandchildTitle = `Branch ${stamp}`;

  // Sign up (writing is auth-gated).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Sam');
  await page.getByLabel('Handle').fill(`sam-${Math.random().toString(36).slice(2, 8)}`);
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
  const rootUrl = page.url();

  await page.locator('main').getByRole('link', { name: 'Create your own option' }).click();
  await page.getByLabel('Choice label').fill(childTitle);
  await page.getByLabel('Chapter title').fill(childTitle);
  await page.getByLabel('Chapter content').fill('A branch.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // Publishing lands the author on the new child chapter (not the parent).
  await expect(page.getByRole('heading', { name: childTitle })).toBeVisible();
  const childUrl = page.url();

  // Add a grandchild under the child, so the root's choice has a real descendant.
  await page.locator('main').getByRole('link', { name: 'Create your own option' }).click();
  await page.getByLabel('Choice label').fill(grandchildTitle);
  await page.getByLabel('Chapter title').fill(grandchildTitle);
  await page.getByLabel('Chapter content').fill('A deeper branch.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();
  await expect(page.getByRole('heading', { name: grandchildTitle })).toBeVisible();

  // Revisiting the child chapter records a view, so its view count ticks up.
  await page.goto(childUrl);
  await expect(page.getByRole('heading', { name: childTitle })).toBeVisible();

  // Back on the root reader: the choice shows its like count plus the new
  // view and descendant signals.
  await page.goto(rootUrl);
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  const choices = page.getByRole('region', { name: 'Choices' });
  const childChoice = choices.getByRole('link', { name: childTitle }).locator('xpath=ancestor::li[1]');
  await expect(choices.getByRole('link', { name: childTitle })).toBeVisible();
  await expect(childChoice.getByLabel('0 likes')).toBeVisible();
  await expect(childChoice.getByLabel(/views/)).toBeVisible();
  await expect(childChoice.getByLabel(/continuation/)).toBeVisible();

  // The homepage feed surfaces the freshly published chapter.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent chapters' })).toBeVisible();
  await expect(
    page.locator('main').getByRole('link', { name: rootTitle, exact: true })
  ).toBeVisible();
});
