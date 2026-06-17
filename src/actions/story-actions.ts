'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import { createStoryWithRootChapter } from '@/lib/chapters';
import { validateChapterContent } from '@/lib/rich-text';

export async function createStory(formData: FormData) {
  const session = await requireUser();
  const storyTitle = String(formData.get('storyTitle') ?? '').trim();
  const chapterTitle = String(formData.get('title') ?? '').trim();
  const content = validateChapterContent(formData.get('content'));
  const tagPermissionRaw = String(formData.get('tagPermission') ?? 'crowd');
  const tagPermission = tagPermissionRaw === 'author' ? 'author' : 'crowd';

  if (!storyTitle || !chapterTitle) {
    throw new Error('Story title and chapter title are required.');
  }

  const story = await createStoryWithRootChapter({
    title: storyTitle,
    authorId: session.user.id,
    chapterTitle,
    content,
    tagPermission
  });

  redirect(`/stories/${story.id}/chapters/${story.rootChapterId}`);
}
