import Link from 'next/link';

import { likeChapterAction } from '@/actions/chapter-actions';
import { ChapterTags, type ChapterTagView } from '@/components/chapters/chapter-tags';
import { MarkdownContent } from '@/components/chapters/markdown-content';
import { ReadMarker } from '@/components/chapters/read-marker';
import { ReportChapter } from '@/components/chapters/report-chapter';
import styles from './chapter-reader.module.css';

type Choice = { id: string; title: string; likeCount: number; read: boolean };

export function ChapterReader({
  storyId,
  chapterId,
  title,
  content,
  storyTitle,
  choices,
  likeCount,
  viewCount,
  viewerHasLiked,
  isSignedIn,
  tags,
  canAddTags,
  canRemoveTags
}: {
  storyId: string;
  chapterId: string;
  title: string;
  content: string;
  storyTitle: string;
  choices: Choice[];
  likeCount: number;
  viewCount: number;
  viewerHasLiked: boolean;
  isSignedIn: boolean;
  tags: ChapterTagView[];
  canAddTags: boolean;
  canRemoveTags: boolean;
}) {
  return (
    <main>
      <article className={styles.article}>
        <p className={styles.breadcrumb}>
          From <Link href={`/stories/${storyId}`}>{storyTitle}</Link>
        </p>
        <h1>{title}</h1>
        <div className={styles.body}>
          <MarkdownContent markdown={content} />
        </div>

        <section aria-label="Reactions" className={styles.reactions}>
          <p className={styles.likeCount}>
            Liked by {likeCount} {likeCount === 1 ? 'reader' : 'readers'}
          </p>
          <p className={styles.viewCount}>
            {viewCount} {viewCount === 1 ? 'view' : 'views'}
          </p>
          {isSignedIn ? (
            <form action={likeChapterAction.bind(null, chapterId, storyId)}>
              <button type="submit" className={`btn ${styles.likeButton}`} disabled={viewerHasLiked}>
                {viewerHasLiked ? 'Liked' : 'Like'}
              </button>
            </form>
          ) : (
            <Link href="/auth/sign-in">Sign in to like</Link>
          )}
        </section>

        <section aria-label="Choices" className={styles.choices}>
          <h2>Choices</h2>
          {choices.length === 0 ? (
            <p className={styles.empty}>No choices yet — be the first to continue this story.</p>
          ) : (
            <ReadMarker markAsReadId={isSignedIn ? undefined : chapterId}>
              {(isReadLocally) => (
                <ul className={styles.choiceList}>
                  {choices.map((choice) => {
                    const read = isSignedIn ? choice.read : isReadLocally(choice.id);
                    return (
                      <li key={choice.id} className={styles.choiceCard}>
                        <Link href={`/stories/${storyId}/chapters/${choice.id}`} className={styles.choiceTitle}>
                          {choice.title}
                        </Link>
                        <span className={styles.choiceLikes}>
                          {read ? 'Read · ' : ''}
                          {choice.likeCount} {choice.likeCount === 1 ? 'like' : 'likes'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ReadMarker>
          )}
          <Link href={`/stories/${storyId}/chapters/${chapterId}/new`} className={`btn btn--secondary ${styles.addChapter}`}>
            Add a chapter
          </Link>
        </section>

        <ChapterTags
          storyId={storyId}
          chapterId={chapterId}
          tags={tags}
          canAdd={canAddTags}
          canRemove={canRemoveTags}
        />

        {isSignedIn ? (
          <section aria-label="Report" className={styles.report}>
            <ReportChapter chapterId={chapterId} />
          </section>
        ) : null}
      </article>
    </main>
  );
}
