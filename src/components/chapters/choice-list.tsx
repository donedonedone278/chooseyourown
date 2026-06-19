'use client';

import Link from 'next/link';

import { useLocalReadIds } from '@/components/chapters/read-marker';
import styles from './chapter-reader.module.css';

export type ChoiceItem = { id: string; title: string; likeCount: number; read: boolean };

/**
 * Renders the chapter's choice list with read flags. A choice is read if the
 * server says so (`choice.read`, signed-in cross-device truth via
 * `getReadChapterIds`) OR the local overlay does (instant client mark, also what
 * keeps Back-navigation fresh). Read choices are dimmed (visited-link metaphor)
 * rather than labelled with text — see the `.read` modifier.
 */
export function ChoiceList({
  storyId,
  choices,
  userId
}: {
  storyId: string;
  choices: ChoiceItem[];
  userId?: string | null;
}) {
  const { has: isReadLocally } = useLocalReadIds(userId);

  return (
    <ul className={styles.choiceList}>
      {choices.map((choice) => {
        const read = choice.read || isReadLocally(choice.id);
        return (
          <li
            key={choice.id}
            className={read ? `${styles.choiceCard} ${styles.read}` : styles.choiceCard}
            data-read={read ? 'true' : undefined}
          >
            <Link href={`/stories/${storyId}/chapters/${choice.id}`} className={styles.choiceTitle}>
              {choice.title}
            </Link>
            <span className={styles.choiceLikes}>
              {read ? <span className="sr-only">Read. </span> : null}
              {choice.likeCount} {choice.likeCount === 1 ? 'like' : 'likes'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
