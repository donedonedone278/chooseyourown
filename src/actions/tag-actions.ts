'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth';
import { addTagToChapter, removeTagFromChapter, suggestTags } from '@/lib/tags';

export async function addChapterTagAction(
  storyId: string,
  chapterId: string,
  formData: FormData
) {
  const session = await requireUser();
  const name = String(formData.get('name') ?? '').trim();

  if (!name) {
    throw new Error('Tag name is required.');
  }

  try {
    await addTagToChapter({ chapterId, name, userId: session.user.id });
  } catch (error) {
    // A repeat add is a harmless no-op, not an error the UI needs to surface.
    if (!(error instanceof Error) || !/already tagged/i.test(error.message)) throw error;
  }

  revalidatePath(`/stories/${storyId}/chapters/${chapterId}`);
}

export async function removeChapterTagAction(
  storyId: string,
  chapterId: string,
  tagId: string
) {
  const session = await requireUser();
  await removeTagFromChapter({ chapterId, tagId, userId: session.user.id });
  revalidatePath(`/stories/${storyId}/chapters/${chapterId}`);
}

export async function suggestTagsAction(prefix: string) {
  await requireUser();
  return suggestTags(prefix, 5);
}
