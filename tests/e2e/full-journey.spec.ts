import { expect, test } from '@playwright/test';
import { createUser } from '@/test/factories';
import { hashPassword } from '@/lib/passwords';

test('admin can remove a reported chapter end-to-end', async ({ page }) => {
  const stamp = Date.now();

  // 1. Writer publishes a story and a child chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Casey');
  await page.getByLabel('Email').fill(`casey-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Casey')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Reported Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Root ${stamp}`);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  await page.locator('main').getByRole('link', { name: 'Add a chapter' }).click();
  const childTitle = `Flagged Chapter ${stamp}`;
  await page.getByLabel('Chapter title').fill(childTitle);
  await page.getByLabel('Chapter content').fill('Content that gets reported.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();
  await page.locator('main').getByRole('link', { name: childTitle }).click();
  await expect(page.getByRole('heading', { name: childTitle })).toBeVisible();
  const chapterUrl = page.url();

  // 2. A second signed-in reader reports it.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley');
  await page.getByLabel('Email').fill(`riley-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley')).toBeVisible();

  await page.goto(chapterUrl);
  await page.getByRole('button', { name: 'Report chapter' }).click();
  await page.getByLabel('Reason').fill('Inappropriate content');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Report submitted')).toBeVisible();

  // 3. An admin signs in, sees the report, and removes the chapter.
  const adminEmail = `admin-${stamp}@example.com`;
  await createUser({
    email: adminEmail,
    displayName: 'Moderator',
    passwordHash: await hashPassword('password123'),
    isAdmin: true
  });

  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as Moderator')).toBeVisible();

  await page.locator('nav').getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Open reports' })).toBeVisible();
  await expect(page.locator('main').getByRole('heading', { name: childTitle })).toBeVisible();

  await page
    .locator('main')
    .getByRole('listitem')
    .filter({ hasText: childTitle })
    .getByRole('button', { name: 'Remove chapter' })
    .click();

  // 4. The removed chapter is gone from the open-reports list, the parent's
  //    choices, and the homepage feed.
  await expect(page.getByRole('heading', { name: 'Open reports' })).toBeVisible();
  await expect(page.locator('main').getByRole('heading', { name: childTitle })).toHaveCount(0);

  await page.goto('/');
  await expect(page.locator('main').getByRole('link', { name: childTitle })).toHaveCount(0);
});
