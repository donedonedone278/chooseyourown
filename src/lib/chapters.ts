import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

export async function createStoryWithRootChapter(input: {
  title: string;
  authorId: string;
  chapterTitle: string;
  content: string;
  tagPermission?: 'crowd' | 'author';
}) {
  return db.$transaction(async (tx) => {
    const story = await tx.story.create({
      data: {
        title: input.title,
        authorId: input.authorId,
        tagPermission: input.tagPermission ?? 'crowd'
      }
    });

    const rootChapter = await tx.chapter.create({
      data: {
        storyId: story.id,
        authorId: input.authorId,
        title: input.chapterTitle,
        content: input.content
      }
    });

    await tx.story.update({
      where: { id: story.id },
      data: { rootChapterId: rootChapter.id }
    });

    return { ...story, rootChapterId: rootChapter.id };
  });
}

export async function createChildChapter(input: {
  storyId: string;
  parentChapterId: string;
  authorId: string;
  title: string;
  content: string;
}) {
  const parent = await db.chapter.findUnique({ where: { id: input.parentChapterId } });

  if (!parent || parent.storyId !== input.storyId || parent.deletedAt) {
    throw new Error('Parent chapter not found in story');
  }

  return db.chapter.create({
    data: {
      storyId: input.storyId,
      parentChapterId: input.parentChapterId,
      authorId: input.authorId,
      title: input.title,
      content: input.content
    }
  });
}

/**
 * Load a chapter (if not soft-deleted) with its story and its non-deleted child
 * chapters. Choices render in creation order so the UI is stable as likes change.
 */
export async function getChapterWithChoices(chapterId: string) {
  return db.chapter.findFirst({
    where: { id: chapterId, deletedAt: null },
    include: {
      story: true,
      author: { select: { id: true, displayName: true } },
      _count: { select: { likes: true } },
      childChapters: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { likes: true } } }
      }
    }
  });
}

/**
 * Descendant counts (whole subtree, excluding the seed itself) for a batch of
 * chapter ids, via one recursive CTE walking `parentChapterId` and filtering
 * out soft-deleted rows. Every requested id is present in the result, defaulting
 * to 0 when it has no (non-deleted) descendants.
 */
export async function getDescendantCounts(chapterIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (chapterIds.length === 0) return counts;

  for (const id of chapterIds) {
    counts.set(id, 0);
  }

  const ids = Prisma.join(chapterIds);

  const rows = await db.$queryRaw<{ rootId: string; count: bigint }[]>(Prisma.sql`
    WITH RECURSIVE descendants("rootId", "id") AS (
      SELECT "id" AS "rootId", "id" FROM "Chapter" WHERE "id" IN (${ids})
      UNION ALL
      SELECT descendants."rootId", "Chapter"."id"
      FROM "Chapter"
      JOIN descendants ON "Chapter"."parentChapterId" = descendants."id"
      WHERE "Chapter"."deletedAt" IS NULL
    )
    SELECT "rootId", COUNT(*) - 1 AS "count"
    FROM descendants
    GROUP BY "rootId"
  `);

  for (const row of rows) {
    counts.set(row.rootId, Number(row.count));
  }

  return counts;
}

export async function likeChapter(input: { chapterId: string; userId: string }) {
  try {
    return await db.chapterLike.create({ data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('already liked');
    }
    throw error;
  }
}

export async function reportChapter(input: {
  chapterId: string;
  userId: string;
  reason: string;
}) {
  return db.chapterReport.create({ data: input });
}

export async function hasUserLikedChapter(chapterId: string, userId: string) {
  const like = await db.chapterLike.findUnique({
    where: { chapterId_userId: { chapterId, userId } }
  });
  return like !== null;
}
