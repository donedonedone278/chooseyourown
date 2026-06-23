import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Record that `viewerKey` opened `chapterId`. Idempotent: the unique
 * `(chapterId, viewerKey)` row means a repeat viewer (e.g. a page reload)
 * never inflates `Chapter.viewCount` past one. The author's own views are
 * recorded (so their read-state stays consistent) but excluded from the count.
 */
export async function recordView(input: {
  chapterId: string;
  viewerKey: string;
  userId?: string | null;
  authorId: string;
}): Promise<{ counted: boolean }> {
  const isAuthor = input.userId != null && input.userId === input.authorId;

  try {
    await db.$transaction(async (tx) => {
      await tx.chapterView.create({
        data: {
          chapterId: input.chapterId,
          viewerKey: input.viewerKey,
          userId: input.userId ?? null
        }
      });

      if (!isAuthor) {
        await tx.chapter.update({
          where: { id: input.chapterId },
          data: { viewCount: { increment: 1 } }
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // A view is best-effort and must never crash the reader:
      //  - P2002: already viewed by this viewerKey (idempotent reload).
      //  - P2003: the viewer's userId FK no longer exists — e.g. a stale JWT
      //    session pointing at a user row deleted by a db reset. Skip the row.
      if (error.code === 'P2002' || error.code === 'P2003') {
        return { counted: false };
      }
    }
    throw error;
  }

  return { counted: !isAuthor };
}

/** Set of `chapterIds` that `userId` has an existing `ChapterView` row for. */
export async function getReadChapterIds(
  userId: string,
  chapterIds: string[]
): Promise<Set<string>> {
  if (chapterIds.length === 0) return new Set();

  const views = await db.chapterView.findMany({
    where: { userId, chapterId: { in: chapterIds } },
    select: { chapterId: true }
  });

  return new Set(views.map((view) => view.chapterId));
}
