import { notFound } from 'next/navigation';

import { createChildChapterAction } from '@/actions/chapter-actions';
import { ChapterForm } from '@/components/chapters/chapter-form';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function NewChildChapterPage({
  params,
  searchParams
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
  searchParams: Promise<{ option?: string }>;
}) {
  await requireUser();
  const { storyId, chapterId } = await params;
  const { option: optionId } = await searchParams;

  let fixedLabel: string | undefined;

  if (optionId) {
    const option = await db.chapterOption.findUnique({ where: { id: optionId } });
    if (!option || option.parentChapterId !== chapterId || option.childChapterId !== null) {
      notFound();
    }
    fixedLabel = option.label;
  }

  const action = createChildChapterAction.bind(null, storyId, chapterId);

  return (
    <main>
      <h1>Add a chapter</h1>
      <ChapterForm action={action} submitLabel="Publish chapter" fixedLabel={fixedLabel} optionId={optionId} />
    </main>
  );
}
