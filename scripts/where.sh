#!/usr/bin/env bash
# "Where were we?" — a one-shot orientation snapshot for resuming a session:
# current branch, uncommitted work, recent commits, any local branches not yet
# merged into develop, the tasks/todo.md state, and whether the dev server is up.
# Read-only and safe to run anytime. See scripts/README.md.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "# Where were we — $(date '+%Y-%m-%d %H:%M')"

echo
echo "## Branch"
git branch --show-current

echo
echo "## Uncommitted changes"
if [ -n "$(git status --short)" ]; then
  git status --short
else
  echo "(clean)"
fi

echo
echo "## Recent commits (this branch)"
git log --oneline -8

echo
echo "## Local branches with work not yet merged into develop"
found=0
for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do
  [ "$b" = "develop" ] && continue
  ahead=$(git rev-list --count "develop..$b" 2>/dev/null || echo 0)
  if [ "$ahead" -gt 0 ]; then
    echo "  - $b ($ahead commit(s) ahead of develop)"
    found=1
  fi
done
[ "$found" -eq 0 ] && echo "(none — every local branch is merged into develop)"

echo
echo "## tasks/todo.md"
if grep -q "<none in progress>" tasks/todo.md 2>/dev/null; then
  echo "placeholder — no feature plan in flight"
else
  echo "has an active plan — open tasks/todo.md"
fi

echo
echo "## Dev server on :3000"
code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000 2>/dev/null || true)"
if [ "$code" = "200" ]; then echo "up (HTTP 200)"; else echo "down"; fi
