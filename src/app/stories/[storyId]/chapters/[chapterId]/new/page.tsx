import { createChildChapterAction } from '@/actions/chapter-actions';
import { ChapterForm } from '@/components/chapters/chapter-form';
import { requireUser } from '@/lib/auth';

export default async function NewChildChapterPage({
  params
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  await requireUser();
  const { storyId, chapterId } = await params;
  const action = createChildChapterAction.bind(null, storyId, chapterId);

  return (
    <main>
      <h1>Add a chapter</h1>
      <ChapterForm action={action} submitLabel="Publish chapter" />
    </main>
  );
}
