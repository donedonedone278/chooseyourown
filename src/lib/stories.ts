import { db } from '@/lib/db';

export async function getStoryById(storyId: string) {
  return db.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

/** Recent non-deleted chapters across all stories, newest first — the homepage feed. */
export async function listRecentChapters(limit = 20) {
  return db.chapter.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { story: true }
  });
}
