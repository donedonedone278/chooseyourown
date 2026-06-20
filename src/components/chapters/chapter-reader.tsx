import Link from 'next/link';

import { likeChapterAction } from '@/actions/chapter-actions';
import { ChapterTags, type ChapterTagView } from '@/components/chapters/chapter-tags';
import { ChoiceList } from '@/components/chapters/choice-list';
import { MarkdownContent } from '@/components/chapters/markdown-content';
import { MarkChapterRead } from '@/components/chapters/read-marker';
import { ReportChapter } from '@/components/chapters/report-chapter';
import { Stat } from '@/components/ui/stat';
import styles from './chapter-reader.module.css';

type Choice = { id: string; title: string; likeCount: number; read: boolean };

export function ChapterReader({
  storyId,
  chapterId,
  parentChapterId,
  title,
  content,
  storyTitle,
  author,
  choices,
  likeCount,
  viewCount,
  viewerHasLiked,
  userId,
  tags,
  canAddTags,
  canRemoveTags
}: {
  storyId: string;
  chapterId: string;
  parentChapterId: string | null;
  title: string;
  content: string;
  storyTitle: string;
  author: { displayName: string; username: string };
  choices: Choice[];
  likeCount: number;
  viewCount: number;
  viewerHasLiked: boolean;
  userId?: string | null;
  tags: ChapterTagView[];
  canAddTags: boolean;
  canRemoveTags: boolean;
}) {
  const isSignedIn = Boolean(userId);
  return (
    <main>
      <article className={styles.article}>
        <p className={styles.breadcrumb}>
          From <Link href={`/stories/${storyId}`}>{storyTitle}</Link>
        </p>
        {parentChapterId ? (
          <Link
            href={`/stories/${storyId}/chapters/${parentChapterId}`}
            className={styles.backLink}
            data-testid="back-to-parent"
            aria-label="Back to the parent chapter"
          >
            ← Back
          </Link>
        ) : null}
        <h1>{title}</h1>
        <p className={styles.byline}>
          by <Link href={`/users/${author.username}`}>{author.displayName}</Link>
        </p>
        <div className={styles.body}>
          <MarkdownContent markdown={content} />
        </div>

        <section aria-label="Reactions" className={styles.reactions}>
          <Stat kind="likes" value={likeCount} active={viewerHasLiked} className={styles.likeCount} />
          <Stat kind="views" value={viewCount} className={styles.viewCount} />
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

        <MarkChapterRead chapterId={chapterId} userId={userId} />

        <section aria-label="Choices" className={styles.choices}>
          <h2>Choices</h2>
          {choices.length === 0 ? (
            <p className={styles.empty}>No choices yet — be the first to continue this story.</p>
          ) : (
            <ChoiceList storyId={storyId} choices={choices} userId={userId} />
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
