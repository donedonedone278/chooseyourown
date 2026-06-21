import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

/** Shared cap for a choice label (`ChapterOption.label`), enforced by the
 * domain helpers below and the server action that wraps them. */
export const MAX_OPTION_LABEL = 120;

function validateLabel(rawLabel: string): string {
  const label = rawLabel.trim();
  if (!label) {
    throw new Error('Choice label is required.');
  }
  if (label.length > MAX_OPTION_LABEL) {
    throw new Error(`Choice label must be ${MAX_OPTION_LABEL} characters or fewer.`);
  }
  return label;
}

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

/**
 * Create a child chapter. Two modes, both producing exactly one realized
 * `ChapterOption` (the invariant: every non-root, non-deleted chapter has
 * exactly one incoming realized option):
 *  - **Open-branch** (`optionId` absent): the writer supplies a new `label`
 *    (required) and an optional `title` (defaults to the label). A fresh
 *    chapter is created, then a realized option pointing at it.
 *  - **Claim** (`optionId` present): the writer is filling in an existing
 *    unclaimed suggested prompt. The chapter is created, then the prompt is
 *    claimed via a guarded `updateMany` (only succeeds if it's still
 *    unclaimed and belongs to this parent) — a concurrent double-claim throws
 *    and rolls back the whole transaction.
 */
export async function createChildChapter(input: {
  storyId: string;
  parentChapterId: string;
  authorId: string;
  label: string;
  title?: string;
  content: string;
  optionId?: string;
}) {
  const label = validateLabel(input.label);
  const finalTitle = input.title?.trim() || label;

  return db.$transaction(async (tx) => {
    const parent = await tx.chapter.findUnique({ where: { id: input.parentChapterId } });

    if (!parent || parent.storyId !== input.storyId || parent.deletedAt) {
      throw new Error('Parent chapter not found in story');
    }

    const chapter = await tx.chapter.create({
      data: {
        storyId: input.storyId,
        parentChapterId: input.parentChapterId,
        authorId: input.authorId,
        title: finalTitle,
        content: input.content
      }
    });

    if (input.optionId) {
      const claim = await tx.chapterOption.updateMany({
        where: { id: input.optionId, childChapterId: null, parentChapterId: input.parentChapterId },
        data: { childChapterId: chapter.id }
      });
      if (claim.count === 0) {
        throw new Error('prompt already claimed');
      }
    } else {
      await tx.chapterOption.create({
        data: {
          parentChapterId: input.parentChapterId,
          childChapterId: chapter.id,
          label,
          createdByUserId: input.authorId
        }
      });
    }

    return chapter;
  });
}

/** Author seeds an unclaimed suggested prompt on a chapter they don't yet
 * have a child for — label only, no destination chapter. Caller-side
 * (the action) is responsible for checking the caller is the parent's author. */
export async function addSuggestedPrompt(input: {
  parentChapterId: string;
  authorId: string;
  label: string;
}) {
  const label = validateLabel(input.label);

  const parent = await db.chapter.findUnique({ where: { id: input.parentChapterId } });
  if (!parent || parent.deletedAt) {
    throw new Error('Parent chapter not found');
  }

  return db.chapterOption.create({
    data: {
      parentChapterId: input.parentChapterId,
      childChapterId: null,
      label,
      createdByUserId: input.authorId
    }
  });
}

/** Remove an unclaimed suggested prompt. Refuses to delete a realized option
 * (already claimed/written) or one the caller doesn't own the parent of. */
export async function deleteSuggestedPrompt(input: { optionId: string; userId: string }) {
  const option = await db.chapterOption.findUnique({
    where: { id: input.optionId },
    include: { parentChapter: true }
  });

  if (!option || option.childChapterId !== null) {
    throw new Error('Suggested prompt not found');
  }
  if (option.parentChapter.authorId !== input.userId) {
    throw new Error('Only the parent chapter author can remove this prompt');
  }

  await db.chapterOption.delete({ where: { id: input.optionId } });
}

/**
 * Load a chapter (if not soft-deleted) with its story and its outgoing
 * options (the choice list). Options render in creation order so the UI is
 * stable as likes change. A realized option whose child was soft-deleted is
 * dropped here (the caller never has to special-case it); an unclaimed
 * suggested prompt has no child and is always kept.
 */
export async function getChapterWithChoices(chapterId: string) {
  const chapter = await db.chapter.findFirst({
    where: { id: chapterId, deletedAt: null },
    include: {
      story: true,
      author: { select: { id: true, displayName: true } },
      _count: { select: { likes: true } },
      optionsFromHere: {
        orderBy: { createdAt: 'asc' },
        include: {
          childChapter: {
            select: {
              id: true,
              title: true,
              viewCount: true,
              deletedAt: true,
              _count: { select: { likes: true } }
            }
          }
        }
      }
    }
  });

  if (!chapter) return chapter;

  return {
    ...chapter,
    optionsFromHere: chapter.optionsFromHere.filter(
      (option) => !option.childChapter || option.childChapter.deletedAt === null
    )
  };
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
