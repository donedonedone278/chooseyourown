import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default async function globalSetup() {
  process.env.DATABASE_URL ??= 'file:./test.db';

  // Start each run from a clean test db so schema changes never collide with
  // leftover rows/columns. (Prisma's --force-reset is blocked when run by an
  // agent, so we drop the file ourselves and let push recreate it fresh.)
  // SQLite resolves file:./test.db relative to prisma/, next to the schema.
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`prisma/test.db${suffix}`, { force: true });
  }

  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
}
