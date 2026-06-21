'use server';

import { redirect } from 'next/navigation';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth';
import {
  addSuggestedPrompt,
  createChildChapter,
  deleteSuggestedPrompt,
  likeChapter,
  reportChapter
} from '@/lib/chapters';
import { db } from '@/lib/db';
import { validateChapterContent } from '@/lib/rich-text';

export async function createChildChapterAction(
  storyId: string,
  parentChapterId: string,
  formData: FormData
) {
  const session = await requireUser();
  const content = validateChapterContent(formData.get('content'));
  const optionId = String(formData.get('option') ?? '').trim() || undefined;
  const titleInput = String(formData.get('title') ?? '').trim();

  let label = String(formData.get('label') ?? '').trim();

  if (optionId) {
    const option = await db.chapterOption.findUnique({ where: { id: optionId } });
    if (!option || option.parentChapterId !== parentChapterId || option.childChapterId !== null) {
      throw new Error('This prompt is no longer available.');
    }
    // The writer is filling in an existing suggested prompt — the label is
    // fixed by the prompt, not re-supplied by the form.
    label = option.label;
  } else if (!label) {
    throw new Error('Choice label is required.');
  }

  let child;
  try {
    child = await createChildChapter({
      storyId,
      parentChapterId,
      authorId: session.user.id,
      label,
      title: titleInput || undefined,
      content,
      optionId
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'prompt already claimed') {
      throw new Error('Someone else just claimed this prompt — pick another choice.');
    }
    throw error;
  }

  // New chapter belongs on the homepage feed, and it's a fresh choice on the
  // parent — drop both cached payloads so a client navigation sees it.
  revalidatePath('/');
  revalidatePath(`/stories/${storyId}/chapters/${parentChapterId}`);

  // Land the author on the chapter they just wrote, not the parent they branched from.
  redirect(`/stories/${storyId}/chapters/${child.id}`);
}

export async function addSuggestedPromptAction(
  storyId: string,
  parentChapterId: string,
  formData: FormData
) {
  const session = await requireUser();
  const parent = await db.chapter.findUnique({ where: { id: parentChapterId } });

  if (!parent || parent.storyId !== storyId) {
    throw new Error('Chapter not found.');
  }
  if (parent.authorId !== session.user.id) {
    throw new Error('Only the chapter author can add a suggested prompt.');
  }

  const label = String(formData.get('label') ?? '').trim();
  await addSuggestedPrompt({ parentChapterId, authorId: session.user.id, label });

  revalidatePath(`/stories/${storyId}/chapters/${parentChapterId}`);
}

export async function deleteSuggestedPromptAction(
  storyId: string,
  parentChapterId: string,
  optionId: string
) {
  const session = await requireUser();
  await deleteSuggestedPrompt({ optionId, userId: session.user.id });
  revalidatePath(`/stories/${storyId}/chapters/${parentChapterId}`);
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
