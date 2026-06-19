import { notFound } from 'next/navigation';

import { recordViewAction } from '@/actions/view-actions';
import { ChapterReader } from '@/components/chapters/chapter-reader';
import { auth } from '@/lib/auth';
import { getChapterWithChoices, hasUserLikedChapter } from '@/lib/chapters';
import { getChapterTags } from '@/lib/tags';
import { getReadChapterIds } from '@/lib/views';

export default async function ChapterPage({
  params
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = await params;
  const chapter = await getChapterWithChoices(chapterId);

  if (!chapter || chapter.storyId !== storyId) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin);
  const viewerHasLiked = userId ? await hasUserLikedChapter(chapter.id, userId) : false;
  const tags = await getChapterTags(chapter.id);

  // Record-on-open: idempotent, so a refresh never inflates the count.
  const { counted } = await recordViewAction(chapter.id, chapter.authorId);
  const viewCount = chapter.viewCount + (counted ? 1 : 0);

  const choiceIds = chapter.childChapters.map((choice) => choice.id);
  const readChoiceIds = userId ? await getReadChapterIds(userId, choiceIds) : new Set<string>();

  const canAddTags = Boolean(
    userId && (chapter.story.tagPermission === 'crowd' || chapter.authorId === userId)
  );
  const canRemoveTags = Boolean(userId && (chapter.authorId === userId || isAdmin));

  return (
    <ChapterReader
      storyId={storyId}
      chapterId={chapter.id}
      title={chapter.title}
      content={chapter.content}
      storyTitle={chapter.story.title}
      choices={chapter.childChapters.map((choice) => ({
        id: choice.id,
        title: choice.title,
        likeCount: choice._count.likes,
        read: readChoiceIds.has(choice.id)
      }))}
      likeCount={chapter._count.likes}
      viewCount={viewCount}
      viewerHasLiked={viewerHasLiked}
      isSignedIn={Boolean(userId)}
      tags={tags}
      canAddTags={canAddTags}
      canRemoveTags={canRemoveTags}
    />
  );
}
