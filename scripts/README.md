# scripts/

Small helpers so regularly-used, multi-step commands live in one place instead of as
`&&` chains in the docs.

## `dev-phone.sh` — `npm run dev:phone`

Starts the Next dev server bound to `0.0.0.0` (reachable beyond the WSL2 VM) and prints
the `http://<windows-LAN-IP>:3000` URL to open on a phone on the same wifi. Also
sanity-checks the Windows port-forward and warns if it's stale or missing. This is the
standard way to run the app for phone testing — `npm run dev` stays localhost-only.

## `phone-url.sh` — `npm run phone:url`

Prints **just** the phone URL (`http://<windows-LAN-IP>:3000`) and exits — no server.
Useful when `dev:phone` is already running in the background and you only need the URL
again (its startup banner is easy to miss in a captured log). Best-effort: falls back to
the WSL/host IP, then a clear message, on non-WSL hosts. Override the port with
`PORT=4000 npm run phone:url`.

## `check.sh` — `npm run check`

Low-noise `npm test`: runs the same gate (lint → typecheck → unit → e2e, fail-fast) but
prints one `✓ <stage>` line per stage on success and dumps output **only** for the stage
that fails. Use it when you just want pass/fail plus the first failure without scrolling;
`npm test` still prints everything. Self-contained (sets the Volta PATH itself).

## `claim.sh` — `npm run claim <feat/initials-name>`

Claims a backlog ticket by **publishing its feature branch**. Syncs `develop`
(`git pull --ff-only`), refuses the name if it's already an active claim on the remote,
creates the branch, and `git push -u`s it so the other contributor can see the ticket is
taken — a published `feat/*`/`fix/*`/`chore/*` branch **is** the claim (see `CLAUDE.md` →
"Branches and workflow"). Only `feat/`, `fix/`, `chore/` prefixes are accepted, so claims
stay greppable. Run it the moment you pick up a ticket, before writing any code; an unpushed
branch is an invisible claim. (Cleanup is the inverse — delete the remote branch on merge,
per the workflow's step 5.)

## `where.sh` — `npm run where`

One-shot **"where were we?"** orientation snapshot for resuming a session: current branch,
uncommitted changes, recent commits, any local branches with work not yet merged into
`develop`, the **active claims** (published `feat/*`/`fix/*`/`chore/*` branches on the remote
— who's on what, so you don't double-claim), whether `tasks/todo.md` holds an active plan,
and whether the dev server is up. Read-only (it does a prune-fetch to refresh the claim list,
but never touches your working tree), safe anytime. Pairs with the `current-work` handoff
memory (intent/next-step) so a reopened session can be re-oriented quickly.

## `volta-env.sh` — (sourced, no npm alias)

`export PATH="$HOME/.volta/bin:$PATH"` so **non-interactive** shells (CI, scripts, the
Claude Code Bash tool) pick up Volta's pinned Node instead of the distro default — Volta's
shims only auto-activate in interactive shells (see `CLAUDE.md` → Environment). Wire it in
per-machine by pointing your shell's `BASH_ENV` at this file; for the Claude Code Bash
tool, set it in the gitignored `.claude/settings.local.json` (local only, never shared):

```json
{ "env": { "BASH_ENV": "/abs/path/to/repo/scripts/volta-env.sh" } }
```

Portable (`$HOME`) and non-destructive (prepends PATH). The file is committed but inert
until something sources it, so it's safe for everyone and helps any contributor who wants
the same convenience.

---

# LAN access from a phone (WSL2)

The phone reaches the WSL2 dev server through two hops: **WSL2 → Windows** (the server
binds `0.0.0.0`, handled by `dev:phone`) and **Windows → phone** (a Windows `portproxy`
+ firewall rule forwarding the LAN port into the WSL2 VM). WSL2's internal IP changes on
every restart, so the forward is re-applied automatically at each Windows logon by a
scheduled task.

> **Per-machine + WSL2-only.** This setup is local to each contributor's machine and
> nothing here is shared or version-controlled beyond `scripts/`. The Windows `portproxy`
> hop below applies **only on a Windows + WSL2 host** — each WSL2 contributor runs the
> one-time install on their own machine (the Windows IP/WSL IP differ per machine, and the
> default port 3000 doesn't collide across machines). A contributor on native
> Linux/macOS doesn't need any of the Windows steps: `npm run dev:phone` already binds
> `0.0.0.0`, so their phone reaches `http://<their-LAN-IP>:3000` directly once the host
> firewall allows inbound 3000.

> **Scope/assumptions:** trusted home wifi, all users trusted, plain HTTP (no TLS).
> `src/lib/auth.ts` already set `trustHost: true` and cookies aren't `Secure`-flagged, so
> auth works over LAN HTTP **with no app-code change** — nothing in `src/` was modified
> for this. Don't use it on an untrusted network.

## Exactly what this creates (the removal inventory)

This is the complete list of state the setup touches, so it can be fully reversed. Three
items live **on Windows, outside this repo** — a `git rm` will *not* remove them; use the
teardown script (below) for those.

| # | Artifact | Location | Removed by |
|---|----------|----------|------------|
| 1 | Scheduled task `WSL Port Forward 3000` | Windows Task Scheduler | teardown script |
| 2 | `portproxy` rule `0.0.0.0:3000 → <wsl-ip>:3000` | Windows `netsh` | teardown script |
| 3 | Firewall rule `WSL dev:3000` (inbound TCP 3000) | Windows Defender Firewall | teardown script |
| 4 | `wsl-port-forward.ps1`, `wsl-port-forward-setup.ps1` | `C:\Users\<you>\` (Windows profile) | teardown script |
| 5 | `scripts/windows/*.ps1` (version-controlled source) | this repo | `git rm` |
| 6 | `scripts/dev-phone.sh` + `"dev:phone"` script in `package.json` | this repo | `git rm` / edit |

Items 1–4 are created by running `wsl-port-forward-setup.ps1`. Item 4 is **copied into
the Windows profile on purpose** — running a `.ps1` off the WSL filesystem at logon is
unreliable (WSL may not be up yet), so the profile copies are the *active* ones and
`scripts/windows/` is the version-controlled source of truth.

## Install (one time)

From an **elevated** PowerShell on Windows (paths use the `Ubuntu` distro):

```powershell
Copy-Item \\wsl.localhost\Ubuntu\home\<you>\repos\chooseyourown\scripts\windows\wsl-port-forward*.ps1 $env:USERPROFILE\
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\wsl-port-forward-setup.ps1"
```

(`\\wsl$\Ubuntu\...` is the older alias for the same path.) The `-ExecutionPolicy
Bypass` form runs the copied script without tripping the default machine policy
(`running scripts is disabled on this system`); a bare `& "...\setup.ps1"` fails there.
Same reason the teardown command below uses it.

- `wsl-port-forward.ps1` — detects the current WSL2 IP and (re)applies items 2 & 3.
  Idempotent; safe to re-run. This is what the logon task runs.
- `wsl-port-forward-setup.ps1` — registers the logon task (item 1, elevated so no
  recurring UAC prompt) and runs the forward once immediately.

## Full removal / "delete it one day"

**Step 1 — remove the Windows state (items 1–4).** From an **elevated** PowerShell, run
the teardown script (idempotent — safe even if pieces are already gone):

```powershell
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu\home\<you>\repos\chooseyourown\scripts\windows\wsl-port-forward-teardown.ps1
```

It unregisters the scheduled task, deletes the portproxy + firewall rules, and removes
the two profile `.ps1` copies, printing each step. (Pass `-Port <n>` if you ever used a
non-default port.)

**Step 2 — remove the repo pieces (items 5–6), if you want them gone too:**

```bash
git rm -r scripts/windows
git rm scripts/dev-phone.sh
# then drop the "dev:phone" line from package.json's "scripts", and the
# phone-testing notes from README.md / CLAUDE.md
```

Nothing in `src/` needs reverting — LAN access was purely tooling + Windows config.

**Verify it's gone** (PowerShell — all three should report nothing / not found):

```powershell
Get-ScheduledTask -TaskName 'WSL Port Forward 3000' -ErrorAction SilentlyContinue
netsh interface portproxy show v4tov4        # no 0.0.0.0:3000 line
Get-NetFirewallRule -DisplayName 'WSL dev:3000' -ErrorAction SilentlyContinue
```

> Just want to pause phone access without uninstalling? Run `npm run dev` (localhost
> only) instead of `npm run dev:phone`. The forward stays configured but unused.
