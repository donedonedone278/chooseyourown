import { db } from '@/lib/db';

/** Reports awaiting admin action (neither resolved nor removed), oldest first. */
export function listOpenReports() {
  return db.chapterReport.findMany({
    where: { removedAt: null, resolvedAt: null },
    include: { chapter: true, user: true },
    orderBy: { createdAt: 'asc' }
  });
}

/** Admin removal: soft-delete the reported chapter and close the report. */
export async function removeReportedChapter(reportId: string) {
  return db.$transaction(async (tx) => {
    const report = await tx.chapterReport.findUniqueOrThrow({ where: { id: reportId } });
    await tx.chapter.update({
      where: { id: report.chapterId },
      data: { deletedAt: new Date() }
    });
    await tx.chapterReport.update({
      where: { id: reportId },
      data: { removedAt: new Date(), resolvedAt: new Date() }
    });
  });
}

/** Dismiss a report without removing the chapter. */
export function dismissReport(reportId: string) {
  return db.chapterReport.update({
    where: { id: reportId },
    data: { resolvedAt: new Date() }
  });
}
