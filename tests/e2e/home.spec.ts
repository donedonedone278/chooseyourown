import { expect, test } from '@playwright/test';

test('homepage shows the recent chapters heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent chapters' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a story' })).toBeVisible();
});
