import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

function uniqueSuffix() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

export async function createUser(overrides: {
  email?: string;
  displayName?: string;
  passwordHash?: string;
  isAdmin?: boolean;
} = {}) {
  const suffix = uniqueSuffix();

  return db.user.create({
    data: {
      email: overrides.email ?? `user-${suffix}@example.com`,
      displayName: overrides.displayName ?? `User ${suffix}`,
      passwordHash: overrides.passwordHash ?? 'hashed-password',
      isAdmin: overrides.isAdmin ?? false
    }
  });
}

export async function createStory(overrides: {
  title?: string;
  authorId: string;
  rootChapterId?: string | null;
}): Promise<{ id: string; title: string; authorId: string; rootChapterId: string | null }> {
  await db.user.upsert({
    where: { id: overrides.authorId },
    update: {},
    create: {
      id: overrides.authorId,
      email: `${overrides.authorId}@example.com`,
      displayName: overrides.authorId,
      passwordHash: 'hashed-password'
    }
  });

  return db.story.create({
    data: {
      title: overrides.title ?? `Story ${uniqueSuffix()}`,
      authorId: overrides.authorId,
      rootChapterId: overrides.rootChapterId ?? null
    }
  });
}

export async function createChapter(overrides: {
  storyId: string;
  authorId: string;
  title?: string;
  contentJson?: Prisma.InputJsonValue;
  parentChapterId?: string | null;
}) {
  await db.user.upsert({
    where: { id: overrides.authorId },
    update: {},
    create: {
      id: overrides.authorId,
      email: `${overrides.authorId}@example.com`,
      displayName: overrides.authorId,
      passwordHash: 'hashed-password'
    }
  });

  return db.chapter.create({
    data: {
      storyId: overrides.storyId,
      authorId: overrides.authorId,
      title: overrides.title ?? `Chapter ${uniqueSuffix()}`,
      contentJson: overrides.contentJson ?? [{ type: 'paragraph', children: [{ text: 'Test content' }] }],
      parentChapterId: overrides.parentChapterId ?? null
    }
  });
}
