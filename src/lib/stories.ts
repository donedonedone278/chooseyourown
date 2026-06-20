import { db } from '@/lib/db';

/**
 * Cover/landing-page data for a story: title, author, root chapter, and
 * lightweight stats derived from its non-deleted chapters.
 */
export async function getStoryOverview(storyId: string) {
  const story = await db.story.findUnique({
    where: { id: storyId },
    include: {
      author: { select: { id: true, displayName: true } },
      chapters: {
        where: { deletedAt: null },
        select: { id: true, parentChapterId: true, authorId: true }
      }
    }
  });

  if (!story) {
    return null;
  }

  const parentIds = new Set(
    story.chapters.map((chapter) => chapter.parentChapterId).filter((id): id is string => id !== null)
  );
  const endingCount = story.chapters.filter((chapter) => !parentIds.has(chapter.id)).length;
  const contributorCount = new Set(story.chapters.map((chapter) => chapter.authorId)).size;

  return {
    title: story.title,
    authorName: story.author.displayName,
    authorId: story.author.id,
    rootChapterId: story.rootChapterId,
    chapterCount: story.chapters.length,
    endingCount,
    contributorCount
  };
}

/** Recent non-deleted chapters across all stories, newest first — the homepage feed. */
export async function listRecentChapters(limit = 20) {
  return db.chapter.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { story: true, author: { select: { id: true, displayName: true } } }
  });
}
