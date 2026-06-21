import { expect, test } from '@playwright/test';

test('signed-in user starts a story and adds a child chapter', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `clocktower-${stamp}@example.com`;

  // Writing is auth-gated, so create an account first.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Quinn');
  await page.getByLabel('Handle').fill(`quinn-${Math.random().toString(36).slice(2, 8)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Quinn')).toBeVisible();

  // Start a story by publishing its first chapter.
  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill('The Clocktower');
  await page.getByLabel('Chapter title').fill('The bell rings');

  // Type plain text, then bold it via the toolbar (WYSIWYG — no typed
  // Markdown syntax).
  const rootEditor = page.getByLabel('Chapter content');
  await rootEditor.fill('The bell rings at midnight.');
  await rootEditor.getByText('The bell rings at midnight.').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  // Lands on the chapter reader.
  await expect(page.getByRole('heading', { name: 'The bell rings' })).toBeVisible();
  await expect(page.locator('main').getByText('The bell rings at midnight.')).toBeVisible();
  await expect(page.locator('main').locator('strong')).toHaveText('The bell rings at midnight.');

  // Add a child chapter under it.
  await page.locator('main').getByRole('link', { name: 'Create your own option' }).click();
  await page.getByLabel('Choice label').fill('Climb the stairs');
  await page.getByLabel('Chapter title').fill('Climb the stairs');

  const childEditor = page.getByLabel('Chapter content');
  await childEditor.fill('You climb the creaking stairs.');
  await childEditor.getByText('You climb the creaking stairs.').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.getByRole('button', { name: 'Italic' }).click();
  await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // The author lands directly on the chapter they just wrote, not the parent.
  await expect(page.getByRole('heading', { name: 'Climb the stairs' })).toBeVisible();
  // The child chapter's content rendered with italics, as applied via the toolbar.
  await expect(page.locator('main').locator('em')).toHaveText('You climb the creaking stairs.');
});
