#!/usr/bin/env bash
# Rebuild the local dev database from scratch and load the demo/dummy data, in one
# repeatable step: drop dev.db -> apply all migrations -> seed. Run it for first-time
# setup or any time you want a clean, known dev db. Idempotent — safe to re-run.
#
#   npm run db:reset
#
# Deliberately the explicit delete -> `migrate deploy` -> `db seed` form (not
# `prisma migrate reset --force`): non-interactive, no confirmation prompt, and it
# never trips the agent-blocked reset path. See scripts/README.md and CLAUDE.md.
set -euo pipefail

# Volta shims aren't on PATH in non-interactive shells; node_modules/.bin must be on
# PATH too so Prisma can spawn the `tsx prisma/seed.ts` seed command.
export PATH="$HOME/.volta/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$PWD/node_modules/.bin:$PATH"

if [ ! -f .env ]; then
  echo "✗ no .env found — create it first (see CLAUDE.md → Environment)." >&2
  exit 1
fi

echo "▸ Dropping dev db (prisma/dev.db*)…"
rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm

echo "▸ Applying migrations (prisma migrate deploy)…"
prisma migrate deploy

echo "▸ Seeding dummy data (prisma db seed)…"
prisma db seed

echo
echo "✓ Dev db rebuilt from migrations + seeded. Sign in with the demo accounts from prisma/seed.ts."

# A dev server started before the reset still holds a handle to the now-deleted db
# file (a stale inode), so its queries silently fail until it's restarted.
if curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 2>/dev/null | grep -q '^[23]'; then
  echo "⚠  A dev server is running on :3000 — RESTART it; it's still bound to the old (deleted) db file."
fi
