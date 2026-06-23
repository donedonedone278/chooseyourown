import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

const NAME_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const MIN_LENGTH = 4;
const MAX_LENGTH = 30;

/** Invalid user-supplied tag names — surfaced to the UI, not a server bug. */
export class InvalidTagNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTagNameError';
  }
}

/**
 * Normalize a raw tag name into the canonical `lowercase_with_underscores` form:
 * lowercase, trim, fold spaces and hyphens into underscores, collapse repeated
 * underscores, and strip leading/trailing underscores. The result must be
 * 4–30 chars of `[a-z0-9_]` with no leading, trailing, or doubled underscores.
 * Throws an `InvalidTagNameError` on invalid input.
 */
export function normalizeTagName(raw: string): string {
  if (typeof raw !== 'string') {
    throw new InvalidTagNameError('Tag name is required.');
  }

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_') // spaces and hyphens become underscores
    .replace(/_+/g, '_') // collapse runs of underscores
    .replace(/^_+|_+$/g, ''); // strip leading/trailing underscores

  if (normalized.length === 0) {
    throw new InvalidTagNameError('Tag name must not be empty.');
  }

  if (!NAME_PATTERN.test(normalized)) {
    throw new InvalidTagNameError(
      'Tag may only contain lowercase letters, numbers, and underscores.'
    );
  }

  if (normalized.length < MIN_LENGTH) {
    throw new InvalidTagNameError(`Tag must be at least ${MIN_LENGTH} characters.`);
  }

  if (normalized.length > MAX_LENGTH) {
    throw new InvalidTagNameError(`Tag must be ${MAX_LENGTH} characters or fewer.`);
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

export type ChapterTagView = {
  chapterTagId: string;
  tagId: string;
  name: string;
  isOfficial: boolean;
  icon: string | null;
};

/** Official tags first, then alphabetical — shared ordering for chapter tag lists. */
function sortChapterTags(tags: ChapterTagView[]): ChapterTagView[] {
  return [...tags].sort((a, b) => {
    if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Tags for a chapter: official first, then alphabetical. */
export async function getChapterTags(chapterId: string): Promise<ChapterTagView[]> {
  const chapterTags = await db.chapterTag.findMany({
    where: { chapterId },
    include: { tag: true }
  });

  return sortChapterTags(
    chapterTags.map((ct) => ({
      chapterTagId: ct.id,
      tagId: ct.tag.id,
      name: ct.tag.name,
      isOfficial: ct.tag.isOfficial,
      icon: ct.tag.icon
    }))
  );
}

/**
 * Batched sibling of `getChapterTags` for a list of chapter ids — avoids an N+1
 * over choices. Every requested id is present in the result (an empty array when
 * untagged); each list is ordered official-first then alphabetical.
 */
export async function getChaptersTags(chapterIds: string[]): Promise<Map<string, ChapterTagView[]>> {
  const tagsByChapter = new Map<string, ChapterTagView[]>();
  if (chapterIds.length === 0) return tagsByChapter;

  for (const id of chapterIds) {
    tagsByChapter.set(id, []);
  }

  const chapterTags = await db.chapterTag.findMany({
    where: { chapterId: { in: chapterIds } },
    include: { tag: true }
  });

  const grouped = new Map<string, ChapterTagView[]>();
  for (const ct of chapterTags) {
    const view: ChapterTagView = {
      chapterTagId: ct.id,
      tagId: ct.tag.id,
      name: ct.tag.name,
      isOfficial: ct.tag.isOfficial,
      icon: ct.tag.icon
    };
    const list = grouped.get(ct.chapterId);
    if (list) {
      list.push(view);
    } else {
      grouped.set(ct.chapterId, [view]);
    }
  }

  for (const [chapterId, views] of grouped) {
    tagsByChapter.set(chapterId, sortChapterTags(views));
  }

  return tagsByChapter;
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
