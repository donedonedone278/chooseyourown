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
    baseURL: 'http://127.0.0.1:3000'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
});
