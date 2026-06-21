import type { FullConfig } from '@playwright/test';

/**
 * Warm the dev server before the parallel suite runs.
 *
 * Next.js dev compiles routes lazily on first request. Playwright starts the
 * tests the instant the server answers `/`, so eight workers can blast a dozen
 * still-uncompiled routes simultaneously — and a cold compile under that load
 * can abort mid-render (an "Application error: a server-side exception" the test
 * then sees instead of the page). Hitting the entry routes once, sequentially,
 * compiles them and lets the server settle before the herd arrives. Best-effort
 * and read-only: any failure here is ignored so the suite still surfaces real
 * problems itself.
 */
async function globalSetup(config: FullConfig) {
  const base =
    config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:3000';

  // Static entry routes every signed-in journey starts from. Warming these
  // (and the few seconds it takes) is what the pre-warmed server already had
  // and the freshly-launched one did not.
  const paths = ['/', '/auth/sign-in', '/auth/sign-up', '/stories/new'];

  // Also warm the dynamic route *patterns* (compiling once covers every id), so
  // no first test request hits a cold reader/story/profile route either. We
  // scrape real ids out of the (now-warm) home feed rather than touching the db
  // from here — the Playwright loader and Prisma don't mix cleanly.
  try {
    const homeHtml = await (await fetch(`${base}/`)).text();
    const chapterMatch = homeHtml.match(/\/stories\/([^/"]+)\/chapters\/([^/"]+)/);
    const userMatch = homeHtml.match(/\/users\/([^/"?]+)/);
    if (chapterMatch) {
      const [, storyId, chapterId] = chapterMatch;
      paths.push(
        `/stories/${storyId}`,
        `/stories/${storyId}/chapters/${chapterId}`,
        `/stories/${storyId}/chapters/${chapterId}/new`
      );
    }
    if (userMatch) {
      paths.push(`/users/${userMatch[1]}`);
    }
  } catch {
    // Best-effort — static warmup above still applies.
  }

  for (const path of paths) {
    try {
      await fetch(`${base}${path}`, { redirect: 'manual' });
    } catch {
      // Best-effort warmup — ignore.
    }
  }
}

export default globalSetup;
