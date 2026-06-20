import { expect, test } from '@playwright/test';

test('sign-up handle becomes a public profile with stats and the new chapter, byline links work', async ({
  page
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const handle = `maya-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Profile Story ${stamp}`;
  const rootTitle = `Profile Root ${stamp}`;

  // Sign up with a handle.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Maya Profile');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Email').fill(`maya-profile-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Maya Profile')).toBeVisible();

  // Publish a chapter so the profile has content.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();

  // The story-cover byline links to the profile.
  await page.locator('main').getByRole('link', { name: storyTitle }).click();
  await expect(page.locator('main').getByRole('heading', { name: storyTitle })).toBeVisible();
  await page.locator('main').getByRole('link', { name: 'Maya Profile' }).click();

  // Profile page is routed by the stable id (cuid), not the @handle.
  await expect(page).toHaveURL(/\/users\/[a-z0-9]+$/);
  const profileUrl = page.url();
  expect(profileUrl).not.toContain(`/users/${handle}`);

  await expect(page.locator('main').getByRole('heading', { name: 'Maya Profile' })).toBeVisible();
  await expect(page.locator('main').getByText(`@${handle}`)).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: rootTitle })).toBeVisible();

  // Switch to Most liked — still shows the same (only) chapter.
  await page.locator('main').getByRole('link', { name: 'Most liked' }).click();
  await expect(page).toHaveURL(`${profileUrl}?sort=likes`);
  await expect(page.locator('main').getByRole('link', { name: rootTitle })).toBeVisible();
});

test('viewing a profile as a different signed-up user increments its profile-views stat', async ({
  page
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerHandle = `riley-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Riley Story ${stamp}`;
  const rootTitle = `Riley Root ${stamp}`;

  // Owner signs up — their profile starts at 0 views (no one has visited it yet).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley Owner');
  await page.getByLabel('Handle').fill(ownerHandle);
  await page.getByLabel('Email').fill(`riley-owner-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley Owner')).toBeVisible();

  // Publish a chapter so there's a byline to click through to the profile —
  // URLs are id-based now, so we reach the profile via the link rather than
  // constructing `/users/<handle>`.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();

  await page.locator('main').getByRole('link', { name: 'Riley Owner' }).click();
  await expect(page).toHaveURL(/\/users\/[a-z0-9]+$/);
  const profileUrl = page.url();
  await expect(page.locator('main').getByLabel('0 views')).toBeVisible();

  // A different signed-up user visits the profile.
  const fresh = await page.context().browser()!.newContext();
  const freshPage = await fresh.newPage();
  const visitorHandle = `vera-${Math.random().toString(36).slice(2, 8)}`;
  await freshPage.goto('/auth/sign-up');
  await freshPage.getByLabel('Display name').fill('Vera Visitor');
  await freshPage.getByLabel('Handle').fill(visitorHandle);
  await freshPage.getByLabel('Email').fill(`vera-visitor-${stamp}@example.com`);
  await freshPage.getByLabel('Password').fill('password123');
  await freshPage.getByRole('button', { name: 'Create account' }).click();
  await expect(freshPage.getByText('Signed in as Vera Visitor')).toBeVisible();

  await freshPage.goto(profileUrl);
  await expect(freshPage.locator('main').getByLabel('1 view')).toBeVisible();
  await fresh.close();

  // The owner's own reload reflects the visitor's view, but not their own.
  await page.goto(profileUrl);
  await expect(page.locator('main').getByLabel('1 view')).toBeVisible();
});

test('signing up with an already-taken handle shows an error instead of crashing', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const handle = `dupe-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Dupe Handle One');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Email').fill(`dupe-handle-one-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Dupe Handle One')).toBeVisible();

  const fresh = await page.context().browser()!.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto('/auth/sign-up');
  await freshPage.getByLabel('Display name').fill('Dupe Handle Two');
  await freshPage.getByLabel('Handle').fill(handle);
  await freshPage.getByLabel('Email').fill(`dupe-handle-two-${stamp}@example.com`);
  await freshPage.getByLabel('Password').fill('password123');
  await freshPage.getByRole('button', { name: 'Create account' }).click();
  await expect(
    freshPage.locator('main').getByText('That handle is already taken.')
  ).toBeVisible();
  await fresh.close();
});

test('signing up with a reserved or invalid handle is rejected', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Reserved Handle');
  await page.getByLabel('Handle').fill('admin');
  await page.getByLabel('Email').fill(`reserved-handle-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.locator('main').getByText(/Handles are 3-30 characters/)
  ).toBeVisible();
});
