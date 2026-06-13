import Link from 'next/link';

import { auth } from '@/lib/auth';
import styles from './site-header.module.css';

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Choose Your Own
        </Link>
        <nav className={styles.nav}>
          <Link href="/stories/new">Start a story</Link>
          {session?.user ? (
            <>
              <span className={styles.signedIn}>Signed in as {session.user.name}</span>
              {session.user.isAdmin ? <Link href="/admin/reports">Reports</Link> : null}
            </>
          ) : (
            <Link href="/auth/sign-in">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
