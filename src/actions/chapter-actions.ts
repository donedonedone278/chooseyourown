'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import { createChildChapter } from '@/lib/chapters';
import { validateChapterContent } from '@/lib/rich-text';

export async function createChildChapterAction(
  storyId: string,
  parentChapterId: string,
  formData: FormData
) {
  const session = await requireUser();
  const title = String(formData.get('title') ?? '').trim();
  const content = validateChapterContent(formData.get('content'));

  if (!title) {
    throw new Error('Chapter title is required.');
  }

  await createChildChapter({
    storyId,
    parentChapterId,
    authorId: session.user.id,
    title,
    content
  });

  redirect(`/stories/${storyId}/chapters/${parentChapterId}`);
}
