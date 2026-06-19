import { describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import { getReadChapterIds, recordView } from '@/lib/views';
import { createChapter, createStory, createUser } from '@/test/factories';

describe('recordView', () => {
  it('increments viewCount once for a new viewer', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const reader = await createUser();

    const result = await recordView({
      chapterId: chapter.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapter.authorId
    });

    expect(result.counted).toBe(true);
    const updated = await db.chapter.findUnique({ where: { id: chapter.id } });
    expect(updated?.viewCount).toBe(1);
  });

  it('does not increment on a second call with the same viewerKey (idempotent)', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const reader = await createUser();

    await recordView({
      chapterId: chapter.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapter.authorId
    });
    const second = await recordView({
      chapterId: chapter.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapter.authorId
    });

    expect(second.counted).toBe(false);
    const updated = await db.chapter.findUnique({ where: { id: chapter.id } });
    expect(updated?.viewCount).toBe(1);
  });

  it('records the row but does not increment when the viewer is the author', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    const result = await recordView({
      chapterId: chapter.id,
      viewerKey: `user:${author.id}`,
      userId: author.id,
      authorId: chapter.authorId
    });

    expect(result.counted).toBe(false);
    const view = await db.chapterView.findUnique({
      where: { chapterId_viewerKey: { chapterId: chapter.id, viewerKey: `user:${author.id}` } }
    });
    expect(view).not.toBeNull();
    const updated = await db.chapter.findUnique({ where: { id: chapter.id } });
    expect(updated?.viewCount).toBe(0);
  });

  it('counts distinct user and device viewer keys separately', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const reader = await createUser();

    await recordView({
      chapterId: chapter.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapter.authorId
    });
    await recordView({
      chapterId: chapter.id,
      viewerKey: 'device:some-uuid',
      userId: undefined,
      authorId: chapter.authorId
    });

    const updated = await db.chapter.findUnique({ where: { id: chapter.id } });
    expect(updated?.viewCount).toBe(2);
  });
});

describe('getReadChapterIds', () => {
  it('returns exactly the subset of chapter ids the user has viewed', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const chapterA = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterB = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterC = await createChapter({ storyId: story.id, authorId: author.id });
    const reader = await createUser();

    await recordView({
      chapterId: chapterA.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapterA.authorId
    });
    await recordView({
      chapterId: chapterB.id,
      viewerKey: `user:${reader.id}`,
      userId: reader.id,
      authorId: chapterB.authorId
    });

    const read = await getReadChapterIds(reader.id, [chapterA.id, chapterB.id, chapterC.id]);

    expect(read.has(chapterA.id)).toBe(true);
    expect(read.has(chapterB.id)).toBe(true);
    expect(read.has(chapterC.id)).toBe(false);
  });
});
