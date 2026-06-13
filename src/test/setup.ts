import { execSync } from 'node:child_process';

const globalForTestSetup = globalThis as { prismaSchemaPrepared?: boolean };

process.env.DATABASE_URL ??= 'file:./test.db';

if (!globalForTestSetup.prismaSchemaPrepared) {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  globalForTestSetup.prismaSchemaPrepared = true;
}
