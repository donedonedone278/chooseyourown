import { notFound } from 'next/navigation';

import { ChapterReader } from '@/components/chapters/chapter-reader';
import { auth } from '@/lib/auth';
import { getChapterWithChoices, hasUserLikedChapter } from '@/lib/chapters';
import { getChapterTags } from '@/lib/tags';

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
        likeCount: choice._count.likes
      }))}
      likeCount={chapter._count.likes}
      viewerHasLiked={viewerHasLiked}
      isSignedIn={Boolean(userId)}
      tags={tags}
      canAddTags={canAddTags}
      canRemoveTags={canRemoveTags}
    />
  );
}
