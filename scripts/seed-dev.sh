#!/usr/bin/env bash
# Load the dev data (all five demo stories + author/login/reader accounts) into
# the dev db. Additive and idempotent — it does NOT drop/migrate; run
# `npm run db:reset` first if you want a clean base (db:reset runs this for you).
#
#   npm run db:seed:dev
#
# Mirrors db-reset.sh's PATH setup, and additionally sources .env so a bare
# `tsx` run (unlike `prisma db seed`) has DATABASE_URL in its environment.
set -euo pipefail

# Volta shims + node_modules/.bin so `tsx` resolves in a non-interactive shell.
export PATH="$HOME/.volta/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$PWD/node_modules/.bin:$PATH"

if [ ! -f .env ]; then
  echo "✗ no .env found — create it first (see CLAUDE.md → Environment)." >&2
  exit 1
fi

# Export the dev DATABASE_URL (and AUTH_SECRET) for the Prisma client.
set -a
# shellcheck disable=SC1091
source .env
set +a

exec tsx prisma/seed-dev.ts
