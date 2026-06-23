import Link from 'next/link';
import { notFound } from 'next/navigation';

import { recordProfileViewAction } from '@/actions/view-actions';
import { Stat } from '@/components/ui/stat';
import { getUserProfileById } from '@/lib/users';
import styles from './profile.module.css';

const SORTS = ['new', 'likes'] as const;
type Sort = (typeof SORTS)[number];

function isSort(value: string | undefined): value is Sort {
  return SORTS.includes(value as Sort);
}

export default async function UserProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const { sort: rawSort } = await searchParams;
  const sort: Sort = isSort(rawSort) ? rawSort : 'new';

  const profile = await getUserProfileById(id);
  if (!profile) {
    notFound();
  }

  // Record-on-open: idempotent, so a refresh never inflates the count. The
  // stats query above ran before this write, so reflect a freshly-counted
  // view immediately rather than waiting for the next render.
  const { counted } = await recordProfileViewAction(profile.id);
  const views = profile.stats.views + (counted ? 1 : 0);

  const chapters = sort === 'likes' ? profile.chaptersMostLiked : profile.chaptersNewest;

  return (
    <main className={styles.profile}>
      <h1>{profile.displayName}</h1>
      <p className={styles.handle}>@{profile.username}</p>

      <div className={styles.stats} data-testid="profile-stats">
        <Stat kind="chapters" value={profile.stats.chapters} explain />
        <Stat kind="stories" value={profile.stats.stories} explain />
        <Stat kind="likes" value={profile.stats.likesReceived} explain />
        <Stat kind="views" value={views} explain />
      </div>

      <nav className={styles.tabs} aria-label="Sort chapters">
        <Link
          href={`/users/${profile.id}?sort=new`}
          className={sort === 'new' ? styles.tabActive : styles.tab}
          aria-current={sort === 'new' ? 'page' : undefined}
        >
          Newest
        </Link>
        <Link
          href={`/users/${profile.id}?sort=likes`}
          className={sort === 'likes' ? styles.tabActive : styles.tab}
          aria-current={sort === 'likes' ? 'page' : undefined}
        >
          Most liked
        </Link>
      </nav>

      {chapters.length === 0 ? (
        <p className={styles.empty}>No chapters yet.</p>
      ) : (
        <ul className={styles.list}>
          {chapters.map((chapter) => (
            <li key={chapter.id} className={styles.item}>
              <Link
                href={`/stories/${chapter.storyId}/chapters/${chapter.id}`}
                className={styles.itemTitle}
              >
                {chapter.title}
              </Link>
              <span className={styles.itemStats}>
                <Stat kind="likes" value={chapter.likeCount} explain />
                <Stat kind="views" value={chapter.viewCount} explain />
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
