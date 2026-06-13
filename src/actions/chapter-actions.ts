'use server';

import { redirect } from 'next/navigation';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth';
import { createChildChapter, likeChapter, reportChapter } from '@/lib/chapters';
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

export async function likeChapterAction(chapterId: string, storyId: string) {
  const session = await requireUser();
  try {
    await likeChapter({ chapterId, userId: session.user.id });
  } catch (error) {
    // One-like-per-user: a repeat click is a harmless no-op, not an error.
    if (!(error instanceof Error) || error.message !== 'already liked') throw error;
  }
  revalidatePath(`/stories/${storyId}/chapters/${chapterId}`);
}

type ReportState = { status: 'idle' | 'submitted' };

export async function reportChapterAction(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const session = await requireUser();
  const chapterId = String(formData.get('chapterId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!chapterId || !reason) throw new Error('A reason is required to report a chapter.');

  await reportChapter({ chapterId, userId: session.user.id, reason });
  return { status: 'submitted' };
}
