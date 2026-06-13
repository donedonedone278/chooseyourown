import Link from 'next/link';

import { auth } from '@/lib/auth';

export async function SiteHeader() {
  const session = await auth();

  return (
    <header>
      <Link href="/">Choose Your Own</Link>
      <nav>
        <Link href="/stories/new">Start a story</Link>
        {session?.user ? (
          <span>Signed in as {session.user.name}</span>
        ) : (
          <Link href="/auth/sign-in">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
