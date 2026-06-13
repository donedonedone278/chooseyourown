import { RecentChapterFeed } from '@/components/feed/recent-chapter-feed';
import { listRecentChapters } from '@/lib/stories';

export default async function HomePage() {
  const chapters = await listRecentChapters();
  return <RecentChapterFeed chapters={chapters} />;
}
