import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Recent chapters</h1>
      <p>See what readers and writers have added most recently.</p>
      <Link href="/stories/new">Write the first chapter</Link>
    </main>
  );
}
