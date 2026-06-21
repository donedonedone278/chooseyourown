import { describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  addTagToChapter,
  getChaptersTags,
  getStoryTopTags,
  normalizeTagName,
  removeTagFromChapter
} from '@/lib/tags';
import { createChapter, createStory, createTag, createUser } from '@/test/factories';

describe('normalizeTagName', () => {
  it('lowercases and trims', () => {
    expect(normalizeTagName('  Horror ')).toBe('horror');
    expect(normalizeTagName('HORROR')).toBe('horror');
  });

  it('converts spaces and hyphens to underscores', () => {
    expect(normalizeTagName('  Sci  Fi  ')).toBe('sci_fi');
    expect(normalizeTagName('haunted house')).toBe('haunted_house');
    expect(normalizeTagName('sci-fi-2')).toBe('sci_fi_2');
  });

  it('collapses runs of underscores and strips leading/trailing ones', () => {
    expect(normalizeTagName('plot___twist')).toBe('plot_twist');
    expect(normalizeTagName('__horror__')).toBe('horror');
  });

  it('rejects empty or whitespace-only names', () => {
    expect(() => normalizeTagName('')).toThrow();
    expect(() => normalizeTagName('   ')).toThrow();
    expect(() => normalizeTagName('___')).toThrow();
  });

  it('rejects names shorter than 4 characters', () => {
    expect(() => normalizeTagName('abc')).toThrow();
    expect(() => normalizeTagName('a b')).toThrow();
  });

  it('rejects names over 30 characters', () => {
    expect(() => normalizeTagName('a'.repeat(31))).toThrow();
  });

  it('rejects disallowed characters', () => {
    expect(() => normalizeTagName('horror!')).toThrow();
    expect(() => normalizeTagName('horror/mystery')).toThrow();
    expect(() => normalizeTagName('horror.txt')).toThrow();
  });
});

describe('addTagToChapter', () => {
  it('allows any signed-in user to add a tag when the story is in crowd mode', async () => {
    const author = await createUser();
    const otherUser = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    const chapterTag = await addTagToChapter({
      chapterId: chapter.id,
      name: 'Horror',
      userId: otherUser.id
    });

    expect(chapterTag.chapterId).toBe(chapter.id);
    expect(chapterTag.addedByUserId).toBe(otherUser.id);

    const tags = await getStoryTopTags(story.id);
    expect(tags.map((t) => t.name)).toContain('horror');
  });

  it('rejects non-author tagging when the story is author-only', async () => {
    const author = await createUser();
    const otherUser = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'author' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    await expect(
      addTagToChapter({ chapterId: chapter.id, name: 'romance', userId: otherUser.id })
    ).rejects.toThrow();
  });

  it('allows the chapter author to tag when the story is author-only', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'author' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    const chapterTag = await addTagToChapter({
      chapterId: chapter.id,
      name: 'romance',
      userId: author.id
    });

    expect(chapterTag.chapterId).toBe(chapter.id);
  });

  it('translates a duplicate add into a domain "already tagged" error, not a P2002 leak', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    await addTagToChapter({ chapterId: chapter.id, name: 'mystery', userId: author.id });

    await expect(
      addTagToChapter({ chapterId: chapter.id, name: 'mystery', userId: author.id })
    ).rejects.toThrow(/already tagged/i);
  });

  it('finds-or-creates a Tag by normalized name; new tags are custom (isOfficial=false)', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    await addTagToChapter({ chapterId: chapter.id, name: '  Brand New Tag ', userId: author.id });

    const tags = await getStoryTopTags(story.id);
    const created = tags.find((t) => t.name === 'brand_new_tag');
    expect(created).toBeDefined();
    expect(created?.isOfficial).toBe(false);
  });
});

describe('removeTagFromChapter', () => {
  it('allows the chapter author to remove a tag', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterTag = await addTagToChapter({
      chapterId: chapter.id,
      name: 'comedy',
      userId: author.id
    });

    await expect(
      removeTagFromChapter({ chapterId: chapter.id, tagId: chapterTag.tagId, userId: author.id })
    ).resolves.not.toThrow();

    const tags = await getStoryTopTags(story.id);
    expect(tags.map((t) => t.name)).not.toContain('comedy');
  });

  it('allows an admin to remove a tag added by someone else', async () => {
    const author = await createUser();
    const otherUser = await createUser();
    const admin = await createUser({ isAdmin: true });
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterTag = await addTagToChapter({
      chapterId: chapter.id,
      name: 'fantasy',
      userId: otherUser.id
    });

    await expect(
      removeTagFromChapter({ chapterId: chapter.id, tagId: chapterTag.tagId, userId: admin.id })
    ).resolves.not.toThrow();
  });

  it('rejects removal by a non-author, non-admin user', async () => {
    const author = await createUser();
    const otherUser = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterTag = await addTagToChapter({
      chapterId: chapter.id,
      name: 'sci-fi',
      userId: author.id
    });

    await expect(
      removeTagFromChapter({ chapterId: chapter.id, tagId: chapterTag.tagId, userId: otherUser.id })
    ).rejects.toThrow();
  });
});

describe('getStoryTopTags', () => {
  it('returns the top-K most-common tags across non-deleted chapters, tiebreaking alphabetically', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapterA = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterB = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterC = await createChapter({ storyId: story.id, authorId: author.id });
    const deletedChapter = await createChapter({ storyId: story.id, authorId: author.id });

    await addTagToChapter({ chapterId: chapterA.id, name: 'horror', userId: author.id });
    await addTagToChapter({ chapterId: chapterB.id, name: 'horror', userId: author.id });
    await addTagToChapter({ chapterId: chapterC.id, name: 'romance', userId: author.id });
    await addTagToChapter({ chapterId: deletedChapter.id, name: 'horror', userId: author.id });

    // Soft-delete one chapter that has the 'horror' tag — it must be excluded from aggregation.
    await db.chapter.update({ where: { id: deletedChapter.id }, data: { deletedAt: new Date() } });

    const topTags = await getStoryTopTags(story.id, 5);
    const horror = topTags.find((t) => t.name === 'horror');
    const romance = topTags.find((t) => t.name === 'romance');

    expect(horror?.count).toBe(2);
    expect(romance?.count).toBe(1);
  });

  it('limits results to K, tiebreaking alphabetically among equal counts', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    await addTagToChapter({ chapterId: chapter.id, name: 'zeta', userId: author.id });
    await addTagToChapter({ chapterId: chapter.id, name: 'alpha', userId: author.id });
    await addTagToChapter({ chapterId: chapter.id, name: 'beta', userId: author.id });

    const topTags = await getStoryTopTags(story.id, 2);
    expect(topTags).toHaveLength(2);
    expect(topTags.map((t) => t.name)).toEqual(['alpha', 'beta']);
  });
});

describe('getChaptersTags', () => {
  it('returns a batched, official-first then alphabetical grouping per chapter id', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapterA = await createChapter({ storyId: story.id, authorId: author.id });
    const chapterB = await createChapter({ storyId: story.id, authorId: author.id });

    const officialTag = await db.tag.upsert({
      where: { name: 'official_horror' },
      update: {},
      create: { name: 'official_horror', isOfficial: true, icon: 'Skull' }
    });
    await db.chapterTag.create({
      data: { chapterId: chapterA.id, tagId: officialTag.id, addedByUserId: author.id }
    });
    await addTagToChapter({ chapterId: chapterA.id, name: 'zeta_custom', userId: author.id });
    await addTagToChapter({ chapterId: chapterA.id, name: 'alpha_custom', userId: author.id });
    await addTagToChapter({ chapterId: chapterB.id, name: 'romance', userId: author.id });

    const tagsByChapter = await getChaptersTags([chapterA.id, chapterB.id]);

    expect(tagsByChapter.get(chapterA.id)?.map((t) => t.name)).toEqual([
      'official_horror',
      'alpha_custom',
      'zeta_custom'
    ]);
    expect(tagsByChapter.get(chapterA.id)?.[0].isOfficial).toBe(true);
    expect(tagsByChapter.get(chapterB.id)?.map((t) => t.name)).toEqual(['romance']);
  });

  it('includes an untagged chapter id as an empty array', async () => {
    const author = await createUser();
    const story = await createStory({ authorId: author.id, tagPermission: 'crowd' });
    const chapter = await createChapter({ storyId: story.id, authorId: author.id });

    const tagsByChapter = await getChaptersTags([chapter.id]);

    expect(tagsByChapter.get(chapter.id)).toEqual([]);
  });

  it('returns an empty Map for empty input', async () => {
    const tagsByChapter = await getChaptersTags([]);

    expect(tagsByChapter.size).toBe(0);
  });
});

describe('createTag factory sanity', () => {
  it('creates an official tag with an icon', async () => {
    const tag = await createTag({ name: 'seed-horror', isOfficial: true, icon: 'Skull' });
    expect(tag.isOfficial).toBe(true);
    expect(tag.icon).toBe('Skull');
  });
});
