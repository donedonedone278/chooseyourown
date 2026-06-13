import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

type ChapterContent = Prisma.InputJsonValue;

export async function createStoryWithRootChapter(input: {
  title: string;
  authorId: string;
  chapterTitle: string;
  content: ChapterContent;
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
        contentJson: input.content
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
  content: ChapterContent;
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
      contentJson: input.content
    }
  });
}
