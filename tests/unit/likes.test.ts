import { describe, expect, it } from 'vitest';
import { likeChapter } from '@/lib/chapters';
import { createUser, createStory, createChapter } from '@/test/factories';

describe('likeChapter', () => {
  it('allows one like per user per chapter and rejects duplicates', async () => {
    const user = await createUser();
    const story = await createStory({ authorId: user.id });
    const chapter = await createChapter({ storyId: story.id, authorId: user.id });

    const like = await likeChapter({ chapterId: chapter.id, userId: user.id });
    expect(like.chapterId).toBe(chapter.id);

    await expect(likeChapter({ chapterId: chapter.id, userId: user.id })).rejects.toThrow(
      'already liked'
    );
  });
});
