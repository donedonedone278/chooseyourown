import { execSync } from 'node:child_process';

export default async function globalSetup() {
  process.env.DATABASE_URL ??= 'file:./test.db';
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
}
