import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getStoryOverview } from '@/lib/stories';
import styles from '../story.module.css';

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const story = await getStoryOverview(storyId);

  if (!story) {
    notFound();
  }

  const { title, authorName, rootChapterId, chapterCount, endingCount, contributorCount } = story;

  return (
    <main className={styles.cover}>
      <h1>{title}</h1>
      <p className={styles.stats}>
        by {authorName} · {chapterCount} chapter{chapterCount === 1 ? '' : 's'} ·{' '}
        {endingCount} ending{endingCount === 1 ? '' : 's'} · {contributorCount} writer
        {contributorCount === 1 ? '' : 's'}
      </p>
      {rootChapterId ? (
        <Link href={`/stories/${storyId}/chapters/${rootChapterId}`} className={`btn btn--primary ${styles.begin}`}>
          Begin the story
        </Link>
      ) : (
        <p className={styles.empty}>No chapters yet.</p>
      )}
    </main>
  );
}
