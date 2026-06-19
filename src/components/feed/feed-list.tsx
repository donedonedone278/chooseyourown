'use client';

import Link from 'next/link';

import { useLocalReadIds } from '@/components/chapters/read-marker';
import styles from './recent-chapter-feed.module.css';

export type FeedItem = {
  id: string;
  title: string;
  storyId: string;
  story: { title: string };
  read: boolean;
};

/**
 * Renders the homepage feed cards with read flags. A chapter is read if the
 * server says so (`chapter.read`, signed-in cross-device truth) OR the local
 * overlay does (instant client mark, also what keeps Back-navigation fresh).
 * Read cards are dimmed (visited-link metaphor) rather than labelled with text —
 * see the `.read` modifier.
 */
export function FeedList({ chapters, userId }: { chapters: FeedItem[]; userId?: string | null }) {
  const { has: isReadLocally } = useLocalReadIds(userId);

  return (
    <ul className={styles.list}>
      {chapters.map((chapter) => {
        const read = chapter.read || isReadLocally(chapter.id);
        return (
          <li
            key={chapter.id}
            className={read ? `${styles.card} ${styles.read}` : styles.card}
            data-read={read ? 'true' : undefined}
          >
            <Link href={`/stories/${chapter.storyId}/chapters/${chapter.id}`} className={styles.cardTitle}>
              {chapter.title}
            </Link>
            <span className={styles.from}>
              {read ? <span className="sr-only">Read. </span> : null}
              from <Link href={`/stories/${chapter.storyId}`}>{chapter.story.title}</Link>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
