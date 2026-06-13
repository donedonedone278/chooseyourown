import { expect, test } from '@playwright/test';

test('signed-in user starts a story and adds a child chapter', async ({ page }) => {
  const email = `clocktower-${Date.now()}@example.com`;

  // Writing is auth-gated, so create an account first.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Quinn');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Quinn')).toBeVisible();

  // Start a story by publishing its first chapter.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill('The Clocktower');
  await page.getByLabel('Chapter title').fill('The bell rings');
  await page.getByLabel('Chapter content').fill('The bell rings at **midnight**.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  // Lands on the chapter reader.
  await expect(page.getByRole('heading', { name: 'The bell rings' })).toBeVisible();
  await expect(page.locator('main').getByText('The bell rings at midnight.')).toBeVisible();

  // Add a child chapter under it.
  await page.locator('main').getByRole('link', { name: 'Add a chapter' }).click();
  await page.getByLabel('Chapter title').fill('Climb the stairs');
  await page.getByLabel('Chapter content').fill('You climb the *creaking* stairs.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // Back on the parent reader, the new chapter shows up as a choice.
  await expect(page.getByRole('heading', { name: 'The bell rings' })).toBeVisible();
  await expect(
    page.locator('main').getByRole('link', { name: 'Climb the stairs' })
  ).toBeVisible();
});
