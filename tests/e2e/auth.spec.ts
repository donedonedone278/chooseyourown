import { expect, test } from '@playwright/test';

test('a new user can create an account and sees signed-in navigation', async ({ page }) => {
  // Unique email per run so the test is repeatable against the shared dev db.
  const email = `avery-${Date.now()}@example.com`;

  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Avery');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Signed in as Avery')).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toHaveCount(0);
});
