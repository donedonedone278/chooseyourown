import { db } from '@/lib/db';

export async function getStoryById(storyId: string) {
  return db.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}
