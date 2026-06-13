import { db } from '@/lib/db';

export async function createStoryWithRootChapter(input: {
  title: string;
  authorId: string;
  chapterTitle: string;
  content: string;
}) {
  return db.$transaction(async (tx) => {
    const story = await tx.story.create({
      data: { title: input.title, authorId: input.authorId }
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
      childChapters: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { likes: true } } }
      }
    }
  });
}
