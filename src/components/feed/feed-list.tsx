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
 * Renders the homepage feed cards with read flags. Signed-in read flags come
 * from the server (`chapter.read`); logged-out viewers get theirs from
 * localStorage on the client.
 */
export function FeedList({ chapters, isSignedIn }: { chapters: FeedItem[]; isSignedIn: boolean }) {
  const { has: isReadLocally } = useLocalReadIds();

  return (
    <ul className={styles.list}>
      {chapters.map((chapter) => {
        const read = isSignedIn ? chapter.read : isReadLocally(chapter.id);
        return (
          <li key={chapter.id} className={styles.card}>
            <Link href={`/stories/${chapter.storyId}/chapters/${chapter.id}`} className={styles.cardTitle}>
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
  );
}
