import Link from 'next/link';

import styles from './recent-chapter-feed.module.css';

type FeedItem = {
  id: string;
  title: string;
  storyId: string;
  story: { title: string };
};

export function RecentChapterFeed({ chapters }: { chapters: FeedItem[] }) {
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
        <ul className={styles.list}>
          {chapters.map((chapter) => (
            <li key={chapter.id} className={styles.card}>
              <Link
                href={`/stories/${chapter.storyId}/chapters/${chapter.id}`}
                className={styles.cardTitle}
              >
                {chapter.title}
              </Link>
              <span className={styles.from}>
                from <Link href={`/stories/${chapter.storyId}`}>{chapter.story.title}</Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
