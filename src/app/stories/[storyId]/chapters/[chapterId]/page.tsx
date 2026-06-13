import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MarkdownContent } from '@/components/chapters/markdown-content';
import { getChapterWithChoices } from '@/lib/chapters';

export default async function ChapterPage({
  params
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = await params;
  const chapter = await getChapterWithChoices(chapterId);

  if (!chapter || chapter.storyId !== storyId) {
    notFound();
  }

  return (
    <main>
      <p>
        From <Link href={`/stories/${storyId}`}>{chapter.story.title}</Link>
      </p>
      <h1>{chapter.title}</h1>
      <MarkdownContent markdown={chapter.content} />

      <section aria-label="Choices">
        <h2>Choices</h2>
        {chapter.childChapters.length === 0 ? (
          <p>No choices yet — be the first to continue this story.</p>
        ) : (
          <ul>
            {chapter.childChapters.map((choice) => (
              <li key={choice.id}>
                <Link href={`/stories/${storyId}/chapters/${choice.id}`}>{choice.title}</Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/stories/${storyId}/chapters/${chapterId}/new`}>Add a chapter</Link>
      </section>
    </main>
  );
}
