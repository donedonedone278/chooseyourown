'use client';

import Link from 'next/link';

import { useLocalReadIds } from '@/components/chapters/read-marker';
import styles from './chapter-reader.module.css';

export type ChoiceItem = { id: string; title: string; likeCount: number; read: boolean };

/**
 * Renders the chapter's choice list with read flags. Signed-in read flags
 * come from the server (`choice.read`, sourced via `getReadChapterIds`);
 * logged-out viewers get their read flags from localStorage on the client.
 */
export function ChoiceList({
  storyId,
  choices,
  isSignedIn
}: {
  storyId: string;
  choices: ChoiceItem[];
  isSignedIn: boolean;
}) {
  const { has: isReadLocally } = useLocalReadIds();

  return (
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
  );
}
