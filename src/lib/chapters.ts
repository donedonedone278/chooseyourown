import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

type ChapterContent = Prisma.InputJsonValue;

async function ensureUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@example.com`,
      displayName: userId,
      passwordHash: 'test-password'
    }
  });
}

export async function createStoryWithRootChapter(input: {
  title: string;
  authorId: string;
  chapterTitle: string;
  content: ChapterContent;
}) {
  return db.$transaction(async (tx) => {
    await ensureUser(tx, input.authorId);

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
  await db.user.upsert({
    where: { id: input.authorId },
    update: {},
    create: {
      id: input.authorId,
      email: `${input.authorId}@example.com`,
      displayName: input.authorId,
      passwordHash: 'test-password'
    }
  });

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
