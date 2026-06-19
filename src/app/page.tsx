import { RecentChapterFeed } from '@/components/feed/recent-chapter-feed';
import { auth } from '@/lib/auth';
import { listRecentChapters } from '@/lib/stories';
import { getReadChapterIds } from '@/lib/views';

export default async function HomePage() {
  const chapters = await listRecentChapters();
  const session = await auth();
  const userId = session?.user?.id;
  const readChapterIds = userId
    ? await getReadChapterIds(userId, chapters.map((chapter) => chapter.id))
    : new Set<string>();

  return (
    <RecentChapterFeed
      chapters={chapters.map((chapter) => ({ ...chapter, read: readChapterIds.has(chapter.id) }))}
      isSignedIn={Boolean(userId)}
    />
  );
}
