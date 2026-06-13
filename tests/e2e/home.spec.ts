import { expect, test } from '@playwright/test';

test('homepage shows the recent chapters heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent chapters' })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Write the first chapter' })).toBeVisible();
});
