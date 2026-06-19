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

test('signing in with an account that does not exist shows an error instead of crashing', async ({
  page
}) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(`nobody-${Date.now()}@donedonedone.com`);
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // We stay on the sign-in page with a friendly message — no 500 / error overlay.
  await expect(page.locator('main').getByText('Incorrect email or password.')).toBeVisible();
  await expect(page.locator('main').getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('signing up with an already-registered email shows an error instead of crashing', async ({
  page
}) => {
  const email = `dupe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  // First account succeeds and signs in.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Dupe One');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Dupe One')).toBeVisible();

  // A second sign-up with the same email is rejected gracefully.
  const fresh = await page.context().browser()!.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto('/auth/sign-up');
  await freshPage.getByLabel('Display name').fill('Dupe Two');
  await freshPage.getByLabel('Email').fill(email);
  await freshPage.getByLabel('Password').fill('password123');
  await freshPage.getByRole('button', { name: 'Create account' }).click();
  await expect(
    freshPage.locator('main').getByText('That email is already registered.')
  ).toBeVisible();
  await fresh.close();
});
