import { expect, test } from '@playwright/test';

test('the child chapter reader links back to its structural parent, root has no such link', async ({
  page
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Backlink Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;
  const childTitle = `Child ${stamp}`;

  // Sign up (writing is auth-gated).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Robin');
  await page.getByLabel('Email').fill(`robin-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Robin')).toBeVisible();

  // Publish a story (root chapter), then a child chapter under the root.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  const rootUrl = page.url();

  await page.locator('main').getByRole('link', { name: 'Add a chapter' }).click();
  await page.getByLabel('Chapter title').fill(childTitle);
  await page.getByLabel('Chapter content').fill('A branch.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();
  await expect(page.getByRole('heading', { name: childTitle })).toBeVisible();

  // On the child chapter reader: the back-to-parent control is visible and works.
  const backLink = page.locator('main').getByTestId('back-to-parent');
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();

  // On the root chapter reader: no back-to-parent control (root has no parent).
  await page.goto(rootUrl);
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  await expect(page.locator('main').getByTestId('back-to-parent')).not.toBeVisible();
});
