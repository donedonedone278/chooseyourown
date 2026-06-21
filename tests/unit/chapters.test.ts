import { describe, expect, it } from 'vitest';
import { createStoryWithRootChapter, createChildChapter } from '@/lib/chapters';
import { createUser } from '@/test/factories';

describe('chapter invariants', () => {
  it('creates a root chapter and a child chapter under exactly one parent', async () => {
    const author = await createUser();
    const childAuthor = await createUser();

    const story = await createStoryWithRootChapter({
      title: 'The Forest Gate',
      authorId: author.id,
      chapterTitle: 'At the gate',
      content: 'You stand before the gate.'
    });

    const child = await createChildChapter({
      storyId: story.id,
      parentChapterId: story.rootChapterId,
      authorId: childAuthor.id,
      label: 'Open the gate',
      content: 'The gate opens.'
    });

    expect(child.parentChapterId).toBe(story.rootChapterId);
    expect(child.storyId).toBe(story.id);
  });
});
