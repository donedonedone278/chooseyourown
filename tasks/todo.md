# Chore: dev tooling — phone-url helper, quiet gate, Volta PATH

**Branch:** `chore/dev-tooling` (off `develop`). Standalone tooling, unrelated to a
feature. Merge to `develop` only after user approval; reset this file to the
placeholder on the branch before merging.

## Why

Recurring friction this contributor hit while working: (1) re-deriving the phone URL
by hand-running a PowerShell IP lookup after backgrounding `dev:phone`; (2) sifting
large `npm test` output; (3) prefixing `export PATH="$HOME/.volta/bin:$PATH"` on every
non-interactive command. All three are scriptable/configurable. Constraint: must not
get in the collaborator's way and must not be too local-environment-specific.

## Plan

1. **`scripts/phone-url.sh` + `npm run phone:url`** — print-only (no server start) one
   line: `http://<win-lan-ip>:<PORT>`. Best-effort PowerShell IP lookup (same as
   `dev-phone.sh`), **graceful fallback** to the WSL IP / a clear message on non-WSL
   hosts so it never hard-crashes elsewhere.
2. **`scripts/check.sh` + `npm run check`** — run the gate (lint → typecheck → unit →
   e2e) but stay quiet on success: one `✓ <stage>` line each, and dump output only for
   the stage that fails. `npm test` still exists and shows everything; this is the
   low-noise variant. Self-contained (sets the Volta PATH itself).
3. **Volta PATH for non-interactive shells** — commit a portable `scripts/volta-env.sh`
   (`export PATH="$HOME/.volta/bin:$PATH"`), then wire `BASH_ENV` → that script in
   **`.claude/settings.local.json`** (gitignored — local only, never reaches the
   collaborator) via the `update-config` skill. Non-destructive (prepends, never
   clobbers PATH). Takes effect next session.

## Docs (required — so these are re-discoverable)
- `scripts/README.md`: document all three scripts.
- `CLAUDE.md` → Commands: add `phone:url` and `check`; note `volta-env.sh` / BASH_ENV.
- Memory note for cross-session recall of the helper scripts.

## Gate
- `npm test` stays green (additive new files + npm aliases; no app code touched).
- Smoke-run `npm run phone:url` and `npm run check`.

## Review

All three done; `npm run check` green (lint, typecheck, unit, e2e).

1. **`scripts/phone-url.sh` + `npm run phone:url`** — prints just `http://<win-ip>:<PORT>`,
   no server. PowerShell IP lookup with graceful fallback to the host IP / a clear message.
   Verified: prints the URL.
2. **`scripts/check.sh` + `npm run check`** — quiet gate, one `✓ <stage>` line per stage,
   output dumped only for a failure. Self-contained (sets Volta PATH). Verified green.
3. **Volta PATH** — committed portable `scripts/volta-env.sh`; wired `BASH_ENV` → it in the
   gitignored `.claude/settings.local.json` via the `update-config` skill (local only, never
   shared). **The harness applied it live this session** — bare `node`/`npm` now resolve to
   the pinned v24.16.0 with no `export PATH` prefix. (Without the wiring, bare `node` falls
   back to the distro `/usr/bin/node`.)

**Collaborator-safety:** the two scripts are new files + additive npm aliases (don't change
any existing command); `volta-env.sh` is inert until something sources it; the `BASH_ENV`
wiring lives only in gitignored `.claude/settings.local.json`. Nothing here reaches `develop`
or the other contributor.

**Docs / re-discovery:** `scripts/README.md` (all three), `CLAUDE.md` → Commands
(`phone:url`, `check`, the BASH_ENV note), and a `dev-tooling-scripts` auto-memory note.
