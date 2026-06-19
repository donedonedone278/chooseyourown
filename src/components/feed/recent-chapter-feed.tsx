import Link from 'next/link';

import { FeedList, type FeedItem } from '@/components/feed/feed-list';
import styles from './recent-chapter-feed.module.css';

export function RecentChapterFeed({
  chapters,
  userId
}: {
  chapters: FeedItem[];
  userId?: string | null;
}) {
  return (
    <main>
      <h1>Recent chapters</h1>
      <p className={styles.intro}>See what readers and writers have added most recently.</p>
      <Link href="/stories/new" className={`btn btn--primary ${styles.cta}`}>
        Write the first chapter
      </Link>

      {chapters.length === 0 ? (
        <p className={styles.empty}>No chapters yet.</p>
      ) : (
        <FeedList chapters={chapters} userId={userId} />
      )}
    </main>
  );
}
