import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

const NAME_PATTERN = /^[a-z0-9 -]+$/;

/**
 * Normalize a raw tag name: lowercase, trim, collapse internal whitespace,
 * restrict to `[a-z0-9 -]`, length 1–30. Throws a domain error on invalid input.
 */
export function normalizeTagName(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('Tag name is required.');
  }

  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalized.length === 0) {
    throw new Error('Tag name must not be empty.');
  }

  if (normalized.length > 30) {
    throw new Error('Tag name must be 30 characters or fewer.');
  }

  if (!NAME_PATTERN.test(normalized)) {
    throw new Error('Tag name may only contain lowercase letters, numbers, spaces, and hyphens.');
  }

  return normalized;
}

/**
 * Add a tag to a chapter. Enforces the story's `tagPermission`:
 * - `crowd` — any signed-in user may add.
 * - `author` — only the chapter's author may add.
 * Finds-or-creates the `Tag` by normalized name (new tags are custom,
 * `isOfficial=false`). A duplicate add is translated into a domain
 * "already tagged" error rather than leaking Prisma's P2002.
 */
export async function addTagToChapter(input: { chapterId: string; name: string; userId: string }) {
  const chapter = await db.chapter.findFirst({
    where: { id: input.chapterId, deletedAt: null },
    include: { story: { select: { tagPermission: true } } }
  });

  if (!chapter) {
    throw new Error('Chapter not found.');
  }

  if (chapter.story.tagPermission === 'author' && chapter.authorId !== input.userId) {
    throw new Error('Only the chapter author may add tags to this story.');
  }

  const name = normalizeTagName(input.name);

  const tag = await db.tag.upsert({
    where: { name },
    update: {},
    create: { name }
  });

  try {
    return await db.chapterTag.create({
      data: {
        chapterId: input.chapterId,
        tagId: tag.id,
        addedByUserId: input.userId
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Chapter is already tagged with this tag.');
    }
    throw error;
  }
}

/**
 * Remove a tag from a chapter. Allowed only for the chapter's author or an admin.
 */
export async function removeTagFromChapter(input: {
  chapterId: string;
  tagId: string;
  userId: string;
}) {
  const chapter = await db.chapter.findFirst({ where: { id: input.chapterId } });

  if (!chapter) {
    throw new Error('Chapter not found.');
  }

  if (chapter.authorId !== input.userId) {
    const user = await db.user.findUnique({ where: { id: input.userId } });
    if (!user?.isAdmin) {
      throw new Error('Only the chapter author or an admin may remove this tag.');
    }
  }

  await db.chapterTag.delete({
    where: { chapterId_tagId: { chapterId: input.chapterId, tagId: input.tagId } }
  });
}

/** Tags for a chapter: official first, then alphabetical. */
export async function getChapterTags(chapterId: string) {
  const chapterTags = await db.chapterTag.findMany({
    where: { chapterId },
    include: { tag: true }
  });

  return chapterTags
    .map((ct) => ({ chapterTagId: ct.id, tagId: ct.tag.id, name: ct.tag.name, isOfficial: ct.tag.isOfficial, icon: ct.tag.icon }))
    .sort((a, b) => {
      if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Aggregate tag counts across a story's non-deleted chapters, returning the
 * top-K by count (tiebreak alphabetically).
 */
export async function getStoryTopTags(storyId: string, k = 5) {
  const chapterTags = await db.chapterTag.findMany({
    where: { chapter: { storyId, deletedAt: null } },
    include: { tag: true }
  });

  const counts = new Map<string, { name: string; isOfficial: boolean; icon: string | null; count: number }>();

  for (const ct of chapterTags) {
    const existing = counts.get(ct.tag.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(ct.tag.id, {
        name: ct.tag.name,
        isOfficial: ct.tag.isOfficial,
        icon: ct.tag.icon,
        count: 1
      });
    }
  }

  return [...counts.entries()]
    .map(([tagId, value]) => ({ tagId, ...value }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    })
    .slice(0, k);
}

/** Existing tags matching a prefix, official first (autocomplete). */
export async function suggestTags(prefix: string, limit = 10) {
  const normalizedPrefix = prefix.trim().toLowerCase();

  const tags = await db.tag.findMany({
    where: normalizedPrefix ? { name: { startsWith: normalizedPrefix } } : undefined,
    take: limit * 2
  });

  return tags
    .sort((a, b) => {
      if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
