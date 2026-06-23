#!/usr/bin/env bash
# claim.sh — claim a backlog ticket by publishing its feature branch.
#
# Syncs develop, refuses the name if it's already an active claim on the remote,
# creates the branch off the freshly-pulled develop, and pushes it (-u) so the
# other contributor can see the ticket is taken. A published feat/*/fix/*/chore/*
# branch IS the claim — see CLAUDE.md -> "Branches and workflow" and the active
# claims list in `npm run where`.
#
#   npm run claim feat/ab-user-profiles
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

branch="${1:-}"
if [ -z "$branch" ]; then
  echo "usage: npm run claim <feat/initials-name | fix/initials-name | chore/initials-name>" >&2
  exit 2
fi

# Keep claims greppable: only the topic prefixes we merge from.
case "$branch" in
  feat/*|fix/*|chore/*) ;;
  *) echo "error: branch must start with feat/, fix/, or chore/ (got '$branch')" >&2; exit 2 ;;
esac

echo "Syncing develop…"
git checkout develop || { echo "error: could not switch to develop (commit/stash first?)" >&2; exit 1; }
git pull --ff-only || { echo "error: 'git pull --ff-only' on develop failed — resolve before claiming" >&2; exit 1; }
git fetch -p origin >/dev/null 2>&1 || true

if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  echo "error: '$branch' is already claimed on the remote — someone's on it." >&2
  echo "       Run 'npm run where' to see active claims, or pick a different name." >&2
  exit 1
fi
if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "error: local branch '$branch' already exists." >&2
  exit 1
fi

git checkout -b "$branch" || exit 1
git push -u origin "$branch" || {
  echo "error: pushing the claim failed — branch created locally but NOT published." >&2
  echo "       Fix connectivity and 'git push -u origin $branch' so the claim is visible." >&2
  exit 1
}

echo
echo "✓ Claimed $branch (published to origin). Next: write the plan into tasks/todo.md."
