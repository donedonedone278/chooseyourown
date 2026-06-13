import { notFound } from 'next/navigation';

import { ChapterReader } from '@/components/chapters/chapter-reader';
import { getChapterWithChoices } from '@/lib/chapters';

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
    />
  );
}
