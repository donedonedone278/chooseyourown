import { requireAdminUser } from '@/lib/auth';
import { listOpenReports } from '@/lib/reports';
import { removeReportedChapterAction, dismissReportAction } from '@/actions/report-actions';
import styles from './reports.module.css';

export default async function ReportsPage() {
  await requireAdminUser(); // redirects non-admins home / signed-out to sign-in
  const reports = await listOpenReports();

  return (
    <main>
      <h1>Open reports</h1>
      {reports.length === 0 ? (
        <p className={styles.empty}>No open reports.</p>
      ) : (
        <ul className={styles.list}>
          {reports.map((report) => (
            <li key={report.id} className={styles.item}>
              <h2>{report.chapter.title}</h2>
              <p className={styles.reason}>{report.reason}</p>
              <p className={styles.reporter}>Reported by {report.user.displayName}</p>
              <div className={styles.actions}>
                <form action={removeReportedChapterAction.bind(null, report.id)}>
                  <button type="submit" className="btn btn--danger">
                    Remove chapter
                  </button>
                </form>
                <form action={dismissReportAction.bind(null, report.id)}>
                  <button type="submit" className="btn btn--secondary">
                    Dismiss
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
