#!/usr/bin/env bash
# Run the Playwright suite against an ISOLATED browser-test db (prisma/e2e.db) on
# its OWN port (:3100), so `npm test` never touches the dev/preview db (dev.db on
# :3000). The browser suite creates rows as it runs; pointing it at e2e.db keeps
# that churn out of the phone preview, and the dedicated port means a running
# `npm run dev:phone` is never reused or clobbered.
#
#   npm run test:e2e                         # whole suite
#   npm run test:e2e -- tests/e2e/home.spec.ts   # a single spec (args pass through)
#
# Each run rebuilds e2e.db from scratch (drop -> migrate -> setup seed -> dev seed)
# so the feed has real stories for tests and for global-setup's route warming.
set -euo pipefail

# Volta shims + node_modules/.bin so prisma/tsx/playwright resolve non-interactively.
export PATH="$HOME/.volta/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$PWD/node_modules/.bin:$PATH"

if [ ! -f .env ]; then
  echo "✗ no .env found — create it first (see CLAUDE.md → Environment)." >&2
  exit 1
fi

# Pull AUTH_SECRET (and anything else) from .env, then override DATABASE_URL to the
# isolated browser-test db. The exported DATABASE_URL is inherited by the Next dev
# server Playwright launches (playwright.config.ts also pins it on webServer.env).
set -a
# shellcheck disable=SC1091
source .env
set +a
export DATABASE_URL="file:./e2e.db"

echo "▸ Building isolated e2e db (prisma/e2e.db)…"
rm -f prisma/e2e.db prisma/e2e.db-journal prisma/e2e.db-wal prisma/e2e.db-shm
prisma migrate deploy
prisma db seed
tsx prisma/seed-dev.ts

echo "▸ Running Playwright (port 3100, db e2e.db)…"
exec playwright test "$@"
