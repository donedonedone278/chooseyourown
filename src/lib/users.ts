import { db } from '@/lib/db';

type ChapterRow = {
  id: string;
  title: string;
  storyId: string;
  likeCount: number;
  viewCount: number;
};

export type UserProfile = {
  id: string;
  displayName: string;
  username: string;
  stats: {
    chapters: number;
    stories: number;
    likesReceived: number;
    views: number;
  };
  chaptersNewest: ChapterRow[];
  chaptersMostLiked: ChapterRow[];
};

/**
 * Public profile data for `/users/[id]`: display name + handle, derived
 * stats, and the chapter list in both sort orders (Newest / Most liked).
 * Routed by the stable `User.id` cuid (not the @handle) so a user can change
 * their handle later without breaking existing links — `username` is still
 * returned for the @ display. Soft-deleted chapters are excluded everywhere.
 * Returns `null` for an unknown id so the page can `notFound()`.
 */
export async function getUserProfileById(id: string): Promise<UserProfile | null> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return null;

  const [storyCount, chaptersNewestRaw, chaptersMostLikedRaw] = await Promise.all([
    db.story.count({ where: { authorId: user.id } }),
    db.chapter.findMany({
      where: { authorId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { likes: true } } }
    }),
    db.chapter.findMany({
      where: { authorId: user.id, deletedAt: null },
      orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
      include: { _count: { select: { likes: true } } }
    })
  ]);

  const toRow = (chapter: (typeof chaptersNewestRaw)[number]): ChapterRow => ({
    id: chapter.id,
    title: chapter.title,
    storyId: chapter.storyId,
    likeCount: chapter._count.likes,
    viewCount: chapter.viewCount
  });

  const likesReceived = chaptersNewestRaw.reduce((sum, chapter) => sum + chapter._count.likes, 0);

  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    stats: {
      chapters: chaptersNewestRaw.length,
      stories: storyCount,
      likesReceived,
      views: user.profileViewCount
    },
    chaptersNewest: chaptersNewestRaw.map(toRow),
    chaptersMostLiked: chaptersMostLikedRaw.map(toRow)
  };
}
