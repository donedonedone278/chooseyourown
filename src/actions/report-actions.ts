'use server';

import { redirect } from 'next/navigation';

import { requireAdminUser } from '@/lib/auth';
import { removeReportedChapter, dismissReport } from '@/lib/reports';

export async function removeReportedChapterAction(reportId: string) {
  await requireAdminUser();
  await removeReportedChapter(reportId);
  redirect('/admin/reports');
}

export async function dismissReportAction(reportId: string) {
  await requireAdminUser();
  await dismissReport(reportId);
  redirect('/admin/reports');
}
