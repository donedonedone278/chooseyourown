'use server';

import { revalidatePath } from 'next/cache';
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

  // The new root chapter belongs on the homepage feed; purge the cached '/'
  // payload (including any prefetched copy) so a client navigation shows it.
  revalidatePath('/');

  redirect(`/stories/${story.id}/chapters/${story.rootChapterId}`);
}
