import { createStory } from '@/actions/story-actions';
import { ChapterForm } from '@/components/chapters/chapter-form';
import { requireUser } from '@/lib/auth';

export default async function NewStoryPage() {
  await requireUser();

  return (
    <main>
      <h1>Start a story</h1>
      <ChapterForm action={createStory} submitLabel="Publish first chapter" includeStoryTitle />
    </main>
  );
}
