import { describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  addSuggestedPrompt,
  createChildChapter,
  deleteSuggestedPrompt,
  getChapterWithChoices
} from '@/lib/chapters';
import { createChapter, createChapterOption, createStory, createUser } from '@/test/factories';

describe('ChapterOption (options-as-edges)', () => {
  it('open-branch creates a chapter and a realized option carrying the label', async () => {
    const author = await createUser();
    const writer = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });

    const child = await createChildChapter({
      storyId: story.id,
      parentChapterId: parent.id,
      authorId: writer.id,
      label: 'Climb the stairs',
      title: 'The Tower Landing',
      content: 'You climb.'
    });

    expect(child.title).toBe('The Tower Landing');

    const option = await db.chapterOption.findUnique({ where: { childChapterId: child.id } });
    expect(option?.label).toBe('Climb the stairs');
    expect(option?.parentChapterId).toBe(parent.id);
    expect(option?.createdByUserId).toBe(writer.id);
  });

  it('falls back the chapter title to the label when title is omitted', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });

    const child = await createChildChapter({
      storyId: story.id,
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Open the door',
      content: 'It creaks open.'
    });

    expect(child.title).toBe('Open the door');
  });

  it('addSuggestedPrompt creates an unclaimed option (no destination chapter)', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });

    const prompt = await addSuggestedPrompt({
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Search the cellar'
    });

    expect(prompt.childChapterId).toBeNull();
    expect(prompt.label).toBe('Search the cellar');
  });

  it('claiming a prompt sets its childChapterId and inherits the label', async () => {
    const author = await createUser();
    const writer = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const prompt = await addSuggestedPrompt({
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Search the cellar'
    });

    const child = await createChildChapter({
      storyId: story.id,
      parentChapterId: parent.id,
      authorId: writer.id,
      label: 'ignored when claiming',
      title: 'Down Below',
      content: 'Dust and cobwebs.',
      optionId: prompt.id
    });

    const claimed = await db.chapterOption.findUnique({ where: { id: prompt.id } });
    expect(claimed?.childChapterId).toBe(child.id);
    expect(claimed?.label).toBe('Search the cellar');
  });

  it('a second claim of the same prompt throws and rolls back the chapter', async () => {
    const author = await createUser();
    const writerA = await createUser();
    const writerB = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const prompt = await addSuggestedPrompt({
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Search the cellar'
    });

    await createChildChapter({
      storyId: story.id,
      parentChapterId: parent.id,
      authorId: writerA.id,
      label: 'unused',
      content: 'First writer wins.',
      optionId: prompt.id
    });

    await expect(
      createChildChapter({
        storyId: story.id,
        parentChapterId: parent.id,
        authorId: writerB.id,
        label: 'unused',
        content: 'Second writer loses.',
        optionId: prompt.id
      })
    ).rejects.toThrow('prompt already claimed');

    const chaptersByWriterB = await db.chapter.findMany({ where: { authorId: writerB.id } });
    expect(chaptersByWriterB).toHaveLength(0);
  });

  it('lists realized options before unclaimed prompts, createdAt order within each group', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });

    // Interleave creation so the rule can't be satisfied by createdAt alone:
    // promptA is created FIRST, yet must still sort after both realized options.
    await addSuggestedPrompt({ parentChapterId: parent.id, authorId: author.id, label: 'Prompt A' });
    const realized1 = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: parent.id,
      label: 'Realized 1'
    });
    await addSuggestedPrompt({ parentChapterId: parent.id, authorId: author.id, label: 'Prompt B' });
    const realized2 = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: parent.id,
      label: 'Realized 2'
    });

    const loaded = await getChapterWithChoices(parent.id);

    expect(loaded?.optionsFromHere.map((o) => o.label)).toEqual([
      'Realized 1',
      'Realized 2',
      'Prompt A',
      'Prompt B'
    ]);
    // Realized options carry their child; prompts don't.
    expect(loaded?.optionsFromHere[0]?.childChapter?.id).toBe(realized1.id);
    expect(loaded?.optionsFromHere[1]?.childChapter?.id).toBe(realized2.id);
    expect(loaded?.optionsFromHere[2]?.childChapter).toBeNull();
    expect(loaded?.optionsFromHere[3]?.childChapter).toBeNull();
  });

  it('drops a realized option whose child has been soft-deleted, but keeps unclaimed prompts', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const deletedChild = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: parent.id,
      label: 'Go down'
    });
    await db.chapter.update({ where: { id: deletedChild.id }, data: { deletedAt: new Date() } });
    await addSuggestedPrompt({ parentChapterId: parent.id, authorId: author.id, label: 'Go up' });

    const loaded = await getChapterWithChoices(parent.id);

    expect(loaded?.optionsFromHere.map((o) => o.label)).toEqual(['Go up']);
  });

  it('deleteSuggestedPrompt removes an unclaimed prompt owned by the parent author', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const prompt = await addSuggestedPrompt({
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Go east'
    });

    await deleteSuggestedPrompt({ optionId: prompt.id, userId: author.id });

    const found = await db.chapterOption.findUnique({ where: { id: prompt.id } });
    expect(found).toBeNull();
  });

  it('deleteSuggestedPrompt refuses to remove a claimed (realized) option', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const child = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: parent.id,
      label: 'Go west'
    });
    const realized = await db.chapterOption.findUniqueOrThrow({ where: { childChapterId: child.id } });

    await expect(deleteSuggestedPrompt({ optionId: realized.id, userId: author.id })).rejects.toThrow();

    const stillThere = await db.chapterOption.findUnique({ where: { id: realized.id } });
    expect(stillThere).not.toBeNull();
  });

  it('deleteSuggestedPrompt refuses a caller who does not own the parent chapter', async () => {
    const author = await createUser();
    const intruder = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });
    const prompt = await addSuggestedPrompt({
      parentChapterId: parent.id,
      authorId: author.id,
      label: 'Go east'
    });

    await expect(deleteSuggestedPrompt({ optionId: prompt.id, userId: intruder.id })).rejects.toThrow();

    const stillThere = await db.chapterOption.findUnique({ where: { id: prompt.id } });
    expect(stillThere).not.toBeNull();
  });

  it('createChapterOption factory creates an unclaimed prompt by default', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const parent = await createChapter({ storyId: story.id, authorId: author.id });

    const option = await createChapterOption({ parentChapterId: parent.id, createdByUserId: author.id });

    expect(option.childChapterId).toBeNull();
  });
});
