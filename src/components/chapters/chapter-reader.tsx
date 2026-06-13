import Link from 'next/link';

import { likeChapterAction } from '@/actions/chapter-actions';
import { MarkdownContent } from '@/components/chapters/markdown-content';
import { ReportChapter } from '@/components/chapters/report-chapter';

type Choice = { id: string; title: string; likeCount: number };

export function ChapterReader({
  storyId,
  chapterId,
  title,
  content,
  storyTitle,
  choices,
  likeCount,
  viewerHasLiked,
  isSignedIn
}: {
  storyId: string;
  chapterId: string;
  title: string;
  content: string;
  storyTitle: string;
  choices: Choice[];
  likeCount: number;
  viewerHasLiked: boolean;
  isSignedIn: boolean;
}) {
  return (
    <main>
      <p>
        From <Link href={`/stories/${storyId}`}>{storyTitle}</Link>
      </p>
      <h1>{title}</h1>
      <MarkdownContent markdown={content} />

      <section aria-label="Reactions">
        <p>
          Liked by {likeCount} {likeCount === 1 ? 'reader' : 'readers'}
        </p>
        {isSignedIn ? (
          <form action={likeChapterAction.bind(null, chapterId, storyId)}>
            <button type="submit" disabled={viewerHasLiked}>
              {viewerHasLiked ? 'Liked' : 'Like'}
            </button>
          </form>
        ) : (
          <Link href="/auth/sign-in">Sign in to like</Link>
        )}
        {isSignedIn ? <ReportChapter chapterId={chapterId} /> : null}
      </section>

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
