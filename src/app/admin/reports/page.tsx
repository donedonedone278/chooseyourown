import { requireAdminUser } from '@/lib/auth';
import { listOpenReports } from '@/lib/reports';
import { removeReportedChapterAction, dismissReportAction } from '@/actions/report-actions';

export default async function ReportsPage() {
  await requireAdminUser(); // redirects non-admins home / signed-out to sign-in
  const reports = await listOpenReports();

  return (
    <main>
      <h1>Open reports</h1>
      {reports.length === 0 ? (
        <p>No open reports.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <h2>{report.chapter.title}</h2>
              <p>{report.reason}</p>
              <p>Reported by {report.user.displayName}</p>
              <form action={removeReportedChapterAction.bind(null, report.id)}>
                <button type="submit">Remove chapter</button>
              </form>
              <form action={dismissReportAction.bind(null, report.id)}>
                <button type="submit">Dismiss</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
