import { expect, test } from '@playwright/test';

test('author suggests a prompt, a second writer claims and writes it', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Prompt Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;
  const promptLabel = `Search the cellar ${stamp}`;
  const claimedChapterTitle = `Dust and Cobwebs ${stamp}`;

  // 1. Author signs up, publishes a story (root chapter).
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Avery');
  await page.getByLabel('Handle').fill(`avery-${Math.random().toString(36).slice(2, 8)}`);
  await page.getByLabel('Email').fill(`avery-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Avery')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  const rootUrl = page.url();

  // 2. As the author, add a suggested prompt — an unclaimed "write this" slot.
  const choicesRegion = page.getByRole('region', { name: 'Choices' });
  await choicesRegion.getByLabel('Suggested prompt label').fill(promptLabel);
  await choicesRegion.getByRole('button', { name: 'Suggest' }).click();

  const promptLink = choicesRegion.getByRole('link', { name: new RegExp(`Unwritten.*${promptLabel}`) });
  await expect(promptLink).toBeVisible();
  await expect(promptLink.locator('xpath=ancestor::li[1]')).toHaveAttribute('data-kind', 'prompt');

  // 3. A second writer signs up, claims the prompt, and writes the chapter.
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Blair');
  await page.getByLabel('Handle').fill(`blair-${Math.random().toString(36).slice(2, 8)}`);
  await page.getByLabel('Email').fill(`blair-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Blair')).toBeVisible();

  await page.goto(rootUrl);
  await page
    .getByRole('region', { name: 'Choices' })
    .getByRole('link', { name: new RegExp(`Unwritten.*${promptLabel}`) })
    .click();

  // The choice label is fixed (claiming, not open-branching) — only the title
  // and content are this writer's to set.
  await expect(page.getByLabel('Choice label')).toHaveValue(promptLabel);
  await page.getByLabel('Chapter title').fill(claimedChapterTitle);
  await page.getByLabel('Chapter content').fill('Dust and cobwebs everywhere.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // Lands on the newly written chapter, showing its own (distinct) title.
  await expect(page.getByRole('heading', { name: claimedChapterTitle })).toBeVisible();

  // 4. Back on the root: the label persists in the option-select, the slot is
  // no longer unclaimed (now a realized link to the claimed chapter).
  await page.goto(rootUrl);
  const rootChoices = page.getByRole('region', { name: 'Choices' });
  const claimedLink = rootChoices.getByRole('link', { name: promptLabel, exact: true });
  await expect(claimedLink).toBeVisible();
  await expect(claimedLink.locator('xpath=ancestor::li[1]')).not.toHaveAttribute('data-kind', 'prompt');
  await expect(rootChoices.getByText(new RegExp(`Unwritten.*${promptLabel}`))).toHaveCount(0);
});

test('open-branch: a writer sets a label distinct from the chapter title', async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storyTitle = `Branch Story ${stamp}`;
  const rootTitle = `Root ${stamp}`;
  const label = `Climb the stairs ${stamp}`;
  const title = `The Tower's Upper Landing ${stamp}`;

  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Casey');
  await page.getByLabel('Handle').fill(`casey-${Math.random().toString(36).slice(2, 8)}`);
  await page.getByLabel('Email').fill(`casey-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Signed in as Casey')).toBeVisible();

  await page.goto('/stories/new');
  await page.getByLabel('Story title').fill(storyTitle);
  await page.getByLabel('Chapter title').fill(rootTitle);
  await page.getByLabel('Chapter content').fill('The root chapter.');
  await page.getByRole('button', { name: 'Publish first chapter' }).click();
  await expect(page.getByRole('heading', { name: rootTitle })).toBeVisible();
  const rootUrl = page.url();

  await page.locator('main').getByRole('link', { name: 'Create your own option' }).click();
  await page.getByLabel('Choice label').fill(label);
  await page.getByLabel('Chapter title').fill(title);
  await page.getByLabel('Chapter content').fill('You climb up.');
  await page.getByRole('button', { name: 'Publish chapter' }).click();

  // The chapter page shows its own title.
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // The parent's option-select shows the label, not the title.
  await page.goto(rootUrl);
  const choices = page.getByRole('region', { name: 'Choices' });
  await expect(choices.getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(choices.getByRole('link', { name: title })).toHaveCount(0);
});
