import { describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import { getDescendantCounts } from '@/lib/chapters';
import { createChapter, createStory, createUser } from '@/test/factories';

describe('getDescendantCounts', () => {
  it('counts a direct child and a nested grandchild', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const root = await createChapter({ storyId: story.id, authorId: author.id });
    const child = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: root.id
    });
    await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: child.id
    });

    const counts = await getDescendantCounts([root.id]);

    expect(counts.get(root.id)).toBe(2);
  });

  it('excludes soft-deleted descendants', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const root = await createChapter({ storyId: story.id, authorId: author.id });
    const child = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: root.id
    });
    const grandchild = await createChapter({
      storyId: story.id,
      authorId: author.id,
      parentChapterId: child.id
    });

    await db.chapter.update({ where: { id: grandchild.id }, data: { deletedAt: new Date() } });

    const counts = await getDescendantCounts([root.id]);

    expect(counts.get(root.id)).toBe(1);
  });

  it('returns 0 for a leaf chapter', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const leaf = await createChapter({ storyId: story.id, authorId: author.id });

    const counts = await getDescendantCounts([leaf.id]);

    expect(counts.get(leaf.id)).toBe(0);
  });

  it('counts two sibling roots independently', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const rootA = await createChapter({ storyId: story.id, authorId: author.id });
    const rootB = await createChapter({ storyId: story.id, authorId: author.id });
    await createChapter({ storyId: story.id, authorId: author.id, parentChapterId: rootA.id });
    await createChapter({ storyId: story.id, authorId: author.id, parentChapterId: rootB.id });
    await createChapter({ storyId: story.id, authorId: author.id, parentChapterId: rootB.id });

    const counts = await getDescendantCounts([rootA.id, rootB.id]);

    expect(counts.get(rootA.id)).toBe(1);
    expect(counts.get(rootB.id)).toBe(2);
  });

  it('returns an empty Map for empty input', async () => {
    const counts = await getDescendantCounts([]);

    expect(counts.size).toBe(0);
  });

  it('includes an id with no descendants as 0 in the Map', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const lonely = await createChapter({ storyId: story.id, authorId: author.id });

    const counts = await getDescendantCounts([lonely.id]);

    expect(counts.has(lonely.id)).toBe(true);
    expect(counts.get(lonely.id)).toBe(0);
  });
});
