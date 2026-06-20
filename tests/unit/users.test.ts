import { describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { getUserProfileByHandle } from '@/lib/users';
import { createChapter, createStory, createUser } from '@/test/factories';

describe('getUserProfileByHandle', () => {
  it('returns null for an unknown handle', async () => {
    const profile = await getUserProfileByHandle('nobody-handle-does-not-exist');
    expect(profile).toBeNull();
  });

  it('returns display name, handle, stats, and both chapter sort orders', async () => {
    const author = await createUser({ displayName: 'Maya Quill', username: `maya-${Date.now()}` });
    const otherUser = await createUser();
    const story = await createStory({ authorId: author.id });

    const chapterA = await createChapter({
      storyId: story.id,
      authorId: author.id,
      title: 'Chapter A'
    });
    // Ensure distinct createdAt ordering between chapters.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const chapterB = await createChapter({
      storyId: story.id,
      authorId: author.id,
      title: 'Chapter B'
    });

    // Like chapterB twice (two distinct likers) so it has more likes than A.
    await db.chapterLike.create({ data: { chapterId: chapterB.id, userId: otherUser.id } });
    const thirdUser = await createUser();
    await db.chapterLike.create({ data: { chapterId: chapterB.id, userId: thirdUser.id } });
    await db.chapterLike.create({ data: { chapterId: chapterA.id, userId: otherUser.id } });

    await db.chapter.update({ where: { id: chapterA.id }, data: { viewCount: 3 } });
    await db.chapter.update({ where: { id: chapterB.id }, data: { viewCount: 4 } });

    const profile = await getUserProfileByHandle(author.username);

    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe('Maya Quill');
    expect(profile!.username).toBe(author.username);
    expect(profile!.stats).toEqual({
      chapters: 2,
      stories: 1,
      likesReceived: 3,
      views: 7
    });

    // Newest first: B was created after A.
    expect(profile!.chaptersNewest.map((c) => c.id)).toEqual([chapterB.id, chapterA.id]);

    // Most liked first: B has 2 likes, A has 1.
    expect(profile!.chaptersMostLiked.map((c) => c.id)).toEqual([chapterB.id, chapterA.id]);

    const entryB = profile!.chaptersMostLiked.find((c) => c.id === chapterB.id)!;
    expect(entryB.likeCount).toBe(2);
    expect(entryB.viewCount).toBe(4);
    expect(entryB.storyId).toBe(story.id);
  });

  it('excludes soft-deleted chapters from stats and lists', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id });
    const liveChapter = await createChapter({ storyId: story.id, authorId: author.id });
    const deletedChapter = await createChapter({ storyId: story.id, authorId: author.id });

    await db.chapter.update({ where: { id: deletedChapter.id }, data: { deletedAt: new Date() } });

    const profile = await getUserProfileByHandle(author.username);

    expect(profile!.stats.chapters).toBe(1);
    expect(profile!.chaptersNewest.map((c) => c.id)).toEqual([liveChapter.id]);
    expect(profile!.chaptersMostLiked.map((c) => c.id)).toEqual([liveChapter.id]);
  });
});
