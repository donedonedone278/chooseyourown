import { expect, test } from '@playwright/test';

test('crowd-mode tagging: two users can each add a tag to the same chapter', async ({
  page,
  browser
}) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // First user signs up and starts a crowd-mode story (the default).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Riley');
  await page.getByLabel('Email').fill(`riley-tag-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Riley')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Tag Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('A chapter worth tagging.');
  await page.getByRole('radio', { name: 'Anyone' }).check();
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Chapter ${stamp}` })).toBeVisible();

  const main = page.locator('main');

  // Riley (the chapter author) adds a tag — it renders as a chip.
  // (The seeded official vocabulary, e.g. "horror", renders with a lucide glyph;
  // covered at the component level in chapter-tags.test.tsx — this e2e spec
  // exercises the add/permission flow without depending on `prisma db seed`
  // having been run against the shared dev db.)
  // Typed with a space; tags normalize to lowercase_with_underscores.
  await main.getByRole('textbox', { name: 'Add a tag' }).fill('haunted house');
  await main.getByRole('button', { name: 'Add' }).click();
  const hauntedTag = main.locator('li', { hasText: 'haunted_house' });
  await expect(hauntedTag).toBeVisible();

  const url = page.url();

  // A second user signs in and, since the story is crowd mode, can add a tag too.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto('/auth/sign-up');
  await secondPage.getByLabel('Display name').fill('Sam');
  await secondPage.getByLabel('Email').fill(`sam-tag-${stamp}@example.com`);
  await secondPage.getByLabel('Password').fill('password123');
  await secondPage.getByRole('button', { name: 'Create account' }).click();
  await expect(secondPage.getByText('Signed in as Sam')).toBeVisible();

  await secondPage.goto(url);
  const secondMain = secondPage.locator('main');
  await secondMain.getByRole('textbox', { name: 'Add a tag' }).fill('a custom tag');
  await secondMain.getByRole('button', { name: 'Add' }).click();
  await expect(secondMain.locator('li', { hasText: 'a_custom_tag' })).toBeVisible();

  // Sam is not the author, so they have no remove control on Riley's tag.
  await expect(secondMain.getByRole('button', { name: 'Remove haunted_house' })).toHaveCount(0);

  await secondContext.close();
});

test('author-only tagging: a non-author cannot add tags', async ({ page, browser }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Morgan');
  await page.getByLabel('Email').fill(`morgan-tag-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Morgan')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Private Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Chapter ${stamp}`);
  await page.getByLabel('Chapter content').fill('Only the author may tag this.');
  await page.getByRole('radio', { name: 'Only me' }).check();
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: `Chapter ${stamp}` })).toBeVisible();

  const url = page.url();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto('/auth/sign-up');
  await otherPage.getByLabel('Display name').fill('Casey');
  await otherPage.getByLabel('Email').fill(`casey-tag-${stamp}@example.com`);
  await otherPage.getByLabel('Password').fill('password123');
  await otherPage.getByRole('button', { name: 'Create account' }).click();
  await expect(otherPage.getByText('Signed in as Casey')).toBeVisible();

  await otherPage.goto(url);
  const otherMain = otherPage.locator('main');
  await expect(otherMain.getByRole('textbox', { name: 'Add a tag' })).toHaveCount(0);

  await otherContext.close();
});
