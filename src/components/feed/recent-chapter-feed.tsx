import Link from 'next/link';

import { ReadMarker } from '@/components/chapters/read-marker';
import styles from './recent-chapter-feed.module.css';

type FeedItem = {
  id: string;
  title: string;
  storyId: string;
  story: { title: string };
  read: boolean;
};

export function RecentChapterFeed({
  chapters,
  isSignedIn
}: {
  chapters: FeedItem[];
  isSignedIn: boolean;
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
        <ReadMarker>
          {(isReadLocally) => (
            <ul className={styles.list}>
              {chapters.map((chapter) => {
                const read = isSignedIn ? chapter.read : isReadLocally(chapter.id);
                return (
                  <li key={chapter.id} className={styles.card}>
                    <Link
                      href={`/stories/${chapter.storyId}/chapters/${chapter.id}`}
                      className={styles.cardTitle}
                    >
                      {chapter.title}
                    </Link>
                    <span className={styles.from}>
                      {read ? 'Read · ' : ''}
                      from <Link href={`/stories/${chapter.storyId}`}>{chapter.story.title}</Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ReadMarker>
      )}
    </main>
  );
}
