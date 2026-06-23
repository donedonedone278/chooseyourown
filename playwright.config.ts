import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Warm the dev server's lazily-compiled routes before the parallel suite, so
  // a cold compile under 8-worker load can't abort a render mid-flight. See the
  // file for the full rationale.
  globalSetup: './tests/e2e/global-setup.ts',
  // One retry. The route-compile flake is handled by globalSetup; this bounds the
  // remaining, pre-existing Tiptap caret/selection race in editor.spec (a real
  // deterministic failure still fails the retry). Not a substitute for fixing
  // that test — see tasks/backlog or a dedicated follow-up.
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  // The browser suite runs on its OWN port + db so it never touches the dev/preview
  // server (:3000 / dev.db). scripts/test-e2e.sh rebuilds prisma/e2e.db before
  // launching; we pin DATABASE_URL here too so the dev server this starts binds the
  // isolated db regardless of how it was invoked. reuseExistingServer is off: each
  // run gets a fresh server on the freshly-built e2e.db, and a running dev:phone on
  // :3000 is never reused or clobbered.
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: { DATABASE_URL: 'file:./e2e.db' }
  }
});
