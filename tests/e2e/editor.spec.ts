import { expect, test } from '@playwright/test';

test('WYSIWYG editor supports paragraphs, bold/italic, and a Markdown view', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Writing is auth-gated, so create an account first.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Devon');
  await page.getByLabel('Handle').fill(`devon-${Math.random().toString(36).slice(2, 8)}`);
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
  //
  // The toolbar's `aria-pressed` reflects the marks active at the current
  // selection (editor.isActive(...)). Asserting it *before* toggling is the
  // sync point: it waits until the selection has actually propagated into the
  // editor, so the mark lands on the intended paragraph instead of a stale
  // selection. Without this, a toolbar click can race the selection and pile
  // both marks onto FirstPara (observed flake: `***FirstPara***`).
  const bold = page.getByRole('button', { name: 'Bold' });
  const italic = page.getByRole('button', { name: 'Italic' });

  await editor.getByText('FirstPara').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await expect(italic).toHaveAttribute('aria-pressed', 'false'); // plain selection registered
  await italic.click();
  await expect(italic).toHaveAttribute('aria-pressed', 'true');

  await editor.getByText('SecondPara').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  // Selection must have moved off the now-italic FirstPara before toggling
  // bold — italic reading false here proves the caret is on the plain second
  // paragraph, not the stale first one.
  await expect(italic).toHaveAttribute('aria-pressed', 'false');
  await expect(bold).toHaveAttribute('aria-pressed', 'false');
  await bold.click();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');

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
