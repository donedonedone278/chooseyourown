'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth';
import { addTagToChapter, InvalidTagNameError, removeTagFromChapter, suggestTags } from '@/lib/tags';

export type AddChapterTagResult = { error?: string };

export async function addChapterTagAction(
  storyId: string,
  chapterId: string,
  formData: FormData
): Promise<AddChapterTagResult> {
  const session = await requireUser();
  const name = String(formData.get('name') ?? '').trim();

  if (!name) {
    return { error: 'Tag name is required.' };
  }

  try {
    await addTagToChapter({ chapterId, name, userId: session.user.id });
  } catch (error) {
    // Invalid input is the user's to fix — surface it inline rather than crashing.
    if (error instanceof InvalidTagNameError) {
      return { error: error.message };
    }
    // A repeat add is a harmless no-op, not an error the UI needs to surface.
    if (!(error instanceof Error) || !/already tagged/i.test(error.message)) throw error;
  }

  revalidatePath(`/stories/${storyId}/chapters/${chapterId}`);
  return {};
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
