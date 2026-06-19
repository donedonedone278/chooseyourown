import { randomUUID } from 'node:crypto';

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
  tagPermission?: string;
}): Promise<{
  id: string;
  title: string;
  authorId: string;
  rootChapterId: string | null;
  tagPermission: string;
}> {
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
      rootChapterId: overrides.rootChapterId ?? null,
      tagPermission: overrides.tagPermission ?? 'crowd'
    }
  });
}

export async function createChapter(overrides: {
  storyId: string;
  authorId: string;
  title?: string;
  content?: string;
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
      content: overrides.content ?? 'Test content.',
      parentChapterId: overrides.parentChapterId ?? null
    }
  });
}

export async function createTag(overrides: {
  name?: string;
  isOfficial?: boolean;
  icon?: string | null;
} = {}) {
  const name = overrides.name ?? `tag-${uniqueSuffix()}`;
  return db.tag.create({
    data: {
      name,
      isOfficial: overrides.isOfficial ?? false,
      icon: overrides.icon ?? null
    }
  });
}
