import { expect, test } from '@playwright/test';

test('WYSIWYG editor supports paragraphs, bold/italic, and a Markdown view', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Writing is auth-gated, so create an account first.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Devon');
  await page.getByLabel('Email').fill(`devon-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Devon')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(`Editor Story ${stamp}`);
  await page.getByLabel('Chapter title').fill(`Editor Chapter ${stamp}`);

  // Type two paragraphs separated by Enter (a real paragraph break in the
  // WYSIWYG editor, unlike a single Enter in raw Markdown).
  const editor = page.getByLabel('Chapter content');
  await editor.click();
  await editor.pressSequentially('FirstPara');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('SecondPara');

  // Click into each paragraph and select its full line (each paragraph is
  // a single word here), then apply formatting via the toolbar.
  await editor.getByText('FirstPara').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.getByRole('button', { name: 'Italic' }).click();
  await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');

  await editor.getByText('SecondPara').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

  // View Markdown reveals the serialized source.
  await page.getByRole('button', { name: 'View Markdown' }).click();
  const markdownPane = page.getByLabel('Markdown source');
  await expect(markdownPane).toBeVisible();
  await expect(markdownPane).toContainText('*FirstPara*');
  await expect(markdownPane).toContainText('**SecondPara**');

  await page.getByRole('button', { name: 'Publish first chapter' }).click();

  // The reader renders two paragraphs with the expected emphasis.
  await expect(page.getByRole('heading', { name: `Editor Chapter ${stamp}` })).toBeVisible();
  const main = page.locator('main');
  await expect(main.locator('em')).toHaveText('FirstPara');
  await expect(main.locator('strong')).toHaveText('SecondPara');
  // The two paragraphs render as separate <p> elements (a real paragraph
  // break), not joined by a soft line break within one paragraph.
  await expect(main.locator('p').filter({ has: page.locator('em') })).toHaveCount(1);
  await expect(main.locator('p').filter({ has: page.locator('strong') })).toHaveCount(1);
  await expect(main.locator('p').filter({ has: page.locator('em') })).not.toContainText('SecondPara');
});
