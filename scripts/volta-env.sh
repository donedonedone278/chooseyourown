# Put Volta's pinned Node on PATH for non-interactive shells.
#
# Volta's shims only activate in interactive shells by default, so non-interactive
# invocations (CI, scripts, the Claude Code Bash tool) otherwise fall back to the
# distro Node — see CLAUDE.md → Environment. Point your shell's BASH_ENV at this
# file to fix that everywhere at once, e.g. in .claude/settings.local.json:
#
#   { "env": { "BASH_ENV": "/abs/path/to/repo/scripts/volta-env.sh" } }
#
# Portable (uses $HOME) and non-destructive (prepends, never clobbers PATH).
# `source` this; it sets no shebang because it's meant to be sourced, not executed.
export PATH="$HOME/.volta/bin:$PATH"
