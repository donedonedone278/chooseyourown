import { describe, expect, it } from 'vitest';
import { reportChapter, getChapterWithChoices } from '@/lib/chapters';
import { listOpenReports, removeReportedChapter } from '@/lib/reports';
import { createUser, createStory, createChapter } from '@/test/factories';

describe('reports', () => {
  it('records a report, lists it as open, and removing it soft-deletes the chapter', async () => {
    const user = await createUser();
    const story = await createStory({ authorId: user.id });
    const chapter = await createChapter({ storyId: story.id, authorId: user.id });

    const report = await reportChapter({
      chapterId: chapter.id,
      userId: user.id,
      reason: 'Spam content'
    });

    const open = await listOpenReports();
    expect(open.map((r) => r.id)).toContain(report.id);

    await removeReportedChapter(report.id);

    // Chapter is hidden from reader queries…
    expect(await getChapterWithChoices(chapter.id)).toBeNull();
    // …and the report no longer counts as open.
    const stillOpen = await listOpenReports();
    expect(stillOpen.map((r) => r.id)).not.toContain(report.id);
  });
});
