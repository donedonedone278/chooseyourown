import Link from 'next/link';

import { MarkdownContent } from '@/components/chapters/markdown-content';

type Choice = { id: string; title: string; likeCount: number };

export function ChapterReader({
  storyId,
  chapterId,
  title,
  content,
  storyTitle,
  choices
}: {
  storyId: string;
  chapterId: string;
  title: string;
  content: string;
  storyTitle: string;
  choices: Choice[];
}) {
  return (
    <main>
      <p>
        From <Link href={`/stories/${storyId}`}>{storyTitle}</Link>
      </p>
      <h1>{title}</h1>
      <MarkdownContent markdown={content} />

      <section aria-label="Choices">
        <h2>Choices</h2>
        {choices.length === 0 ? (
          <p>No choices yet — be the first to continue this story.</p>
        ) : (
          <ul>
            {choices.map((choice) => (
              <li key={choice.id}>
                <Link href={`/stories/${storyId}/chapters/${choice.id}`}>{choice.title}</Link>{' '}
                <span>
                  {choice.likeCount} {choice.likeCount === 1 ? 'like' : 'likes'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/stories/${storyId}/chapters/${chapterId}/new`}>Add a chapter</Link>
      </section>
    </main>
  );
}
