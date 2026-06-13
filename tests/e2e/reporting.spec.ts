import { expect, test } from '@playwright/test';

test('a signed-in reader can like a chapter and report it', async ({ page }) => {
  // Date.now() alone collides across parallel workers; add randomness so emails stay unique.
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
