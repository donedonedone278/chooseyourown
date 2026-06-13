import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getStoryById } from '@/lib/stories';
import styles from '../story.module.css';

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const story = await getStoryById(storyId);

  if (!story) {
    notFound();
  }

  return (
    <main>
      <h1>{story.title}</h1>
      <p className={styles.meta}>
        {story.chapters.length} chapter{story.chapters.length === 1 ? '' : 's'}
      </p>
      <ul className={styles.list}>
        {story.chapters.map((chapter) => (
          <li key={chapter.id} className={styles.item}>
            <Link href={`/stories/${storyId}/chapters/${chapter.id}`}>{chapter.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
