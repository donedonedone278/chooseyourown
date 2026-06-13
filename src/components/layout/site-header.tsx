import Link from 'next/link';

export function SiteHeader() {
  return (
    <header>
      <Link href="/">Choose Your Own</Link>
      <nav>
        <a href="/stories/new">Start a story</a>
        <a href="/auth/sign-in">Sign in</a>
      </nav>
    </header>
  );
}
