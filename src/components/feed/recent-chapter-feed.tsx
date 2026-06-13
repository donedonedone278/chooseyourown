import Link from 'next/link';

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
      <p>See what readers and writers have added most recently.</p>
      <Link href="/stories/new">Write the first chapter</Link>

      {chapters.length === 0 ? (
        <p>No chapters yet.</p>
      ) : (
        <ul>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link href={`/stories/${chapter.storyId}/chapters/${chapter.id}`}>
                {chapter.title}
              </Link>{' '}
              <span>
                from <Link href={`/stories/${chapter.storyId}`}>{chapter.story.title}</Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
