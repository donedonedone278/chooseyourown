import Link from 'next/link';

import {
  addSuggestedPromptAction,
  deleteSuggestedPromptAction,
  likeChapterAction
} from '@/actions/chapter-actions';
import { ChapterTags, type ChapterTagView } from '@/components/chapters/chapter-tags';
import { ChoiceList, type ChoiceItem } from '@/components/chapters/choice-list';
import { MarkdownContent } from '@/components/chapters/markdown-content';
import { MarkChapterRead } from '@/components/chapters/read-marker';
import { ReportChapter } from '@/components/chapters/report-chapter';
import { Stat } from '@/components/ui/stat';
import styles from './chapter-reader.module.css';

type Choice = ChoiceItem;

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
  canRemoveTags,
  isAuthor
}: {
  storyId: string;
  chapterId: string;
  parentChapterId: string | null;
  title: string;
  content: string;
  storyTitle: string;
  author: { id: string; displayName: string };
  choices: Choice[];
  likeCount: number;
  viewCount: number;
  viewerHasLiked: boolean;
  userId?: string | null;
  tags: ChapterTagView[];
  canAddTags: boolean;
  canRemoveTags: boolean;
  /** Viewer is this chapter's author — gates the add/delete suggested-prompt UI. */
  isAuthor: boolean;
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
          by <Link href={`/users/${author.id}`}>{author.displayName}</Link>
        </p>
        <div className={styles.body}>
          <MarkdownContent markdown={content} />
        </div>

        <section aria-label="Reactions" className={styles.reactions}>
          <Stat
            kind="likes"
            value={likeCount}
            active={viewerHasLiked}
            explain
            className={styles.likeCount}
          />
          <Stat kind="views" value={viewCount} explain className={styles.viewCount} />
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
            <ChoiceList storyId={storyId} chapterId={chapterId} choices={choices} userId={userId} />
          )}
          {isAuthor ? (
            <ul className={styles.promptManageList}>
              {choices
                .filter((choice) => choice.kind === 'prompt')
                .map((prompt) => (
                  <li key={prompt.optionId} className={styles.promptManageRow}>
                    <span>{prompt.label}</span>
                    <form
                      action={deleteSuggestedPromptAction.bind(null, storyId, chapterId, prompt.optionId)}
                    >
                      <button type="submit" className={styles.promptDelete} aria-label={`Remove suggested prompt: ${prompt.label}`}>
                        ×
                      </button>
                    </form>
                  </li>
                ))}
            </ul>
          ) : null}
          <Link href={`/stories/${storyId}/chapters/${chapterId}/new`} className={`btn btn--secondary ${styles.addChapter}`}>
            Add a chapter
          </Link>
          {isAuthor ? (
            <form
              action={addSuggestedPromptAction.bind(null, storyId, chapterId)}
              className={styles.addPromptForm}
              aria-label="Add a suggested prompt"
            >
              <label className={styles.addPromptLabel}>
                <span className="sr-only">Suggested prompt label</span>
                <input type="text" name="label" placeholder="Suggest a next choice…" required />
              </label>
              <button type="submit" className="btn btn--secondary">
                ✎ Suggest
              </button>
            </form>
          ) : null}
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
