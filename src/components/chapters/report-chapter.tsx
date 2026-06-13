'use client';

import { useActionState, useState } from 'react';
import { reportChapterAction } from '@/actions/chapter-actions';

export function ReportChapter({ chapterId }: { chapterId: string }) {
  const [state, formAction] = useActionState(reportChapterAction, { status: 'idle' as const });
  const [isOpen, setIsOpen] = useState(false);

  if (state.status === 'submitted') return <p>Report submitted</p>;

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)}>
        Report chapter
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="chapterId" value={chapterId} />
      <label>
        Reason
        <textarea name="reason" required rows={3} />
      </label>
      <button type="submit">Submit report</button>
    </form>
  );
}
