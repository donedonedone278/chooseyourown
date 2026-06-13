import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Transform JSX/TSX with the automatic React runtime so component tests don't
  // need to import React. (Avoids @vitejs/plugin-react, which currently pins a
  // newer Vite than Vitest ships.)
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    // Default environment is node (domain/Prisma tests). Component tests opt
    // into jsdom per-file with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles: ['./src/test/setup.ts', './src/test/setup-dom.ts'],
    fileParallelism: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    passWithNoTests: true
  }
});
