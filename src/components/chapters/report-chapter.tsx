'use client';

import { useActionState, useState } from 'react';
import { reportChapterAction } from '@/actions/chapter-actions';
import styles from './report-chapter.module.css';

export function ReportChapter({ chapterId }: { chapterId: string }) {
  const [state, formAction] = useActionState(reportChapterAction, { status: 'idle' as const });
  const [isOpen, setIsOpen] = useState(false);

  if (state.status === 'submitted') return <p className={styles.confirmation}>Report submitted</p>;

  if (!isOpen) {
    return (
      <button type="button" className="btn btn--secondary" onClick={() => setIsOpen(true)}>
        Report chapter
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="chapterId" value={chapterId} />
      <label>
        Reason
        <textarea name="reason" required rows={3} />
      </label>
      <button type="submit" className="btn btn--secondary">
        Submit report
      </button>
    </form>
  );
}
