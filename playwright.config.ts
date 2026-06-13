import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const localLibraryPath = path.join(
  process.cwd(),
  '.local-libs/usr/lib/x86_64-linux-gnu'
);

process.env.LD_LIBRARY_PATH = [
  localLibraryPath,
  process.env.LD_LIBRARY_PATH
].filter(Boolean).join(':');

export default defineConfig({
  testDir: './tests/e2e',
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
