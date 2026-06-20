import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default async function globalSetup() {
  process.env.DATABASE_URL ??= 'file:./test.db';

  // Start each run from a clean test db so schema changes never collide with
  // leftover rows/columns. (Prisma's --force-reset is blocked when run by an
  // agent, so we drop the file ourselves and let `migrate deploy` recreate it.)
  // SQLite resolves file:./test.db relative to prisma/, next to the schema.
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`prisma/test.db${suffix}`, { force: true });
  }

  // Apply the committed migrations (not `db push`) so the suite runs against the
  // exact migrated schema and a broken migration fails the gate. `migrate deploy`
  // is non-interactive and recreates the fresh db from the migration history.
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
