# scripts/

Small helpers so regularly-used, multi-step commands live in one place instead of as
`&&` chains in the docs.

## `dev-phone.sh` — `npm run dev:phone`

Starts the Next dev server bound to `0.0.0.0` (reachable beyond the WSL2 VM) and prints
the `http://<windows-LAN-IP>:3000` URL to open on a phone on the same wifi. Also
sanity-checks the Windows port-forward and warns if it's stale or missing. This is the
standard way to run the app for phone testing — `npm run dev` stays localhost-only.

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

## Troubleshooting

### Phone (or even the Windows browser) can't load `http://<LAN-IP>:3000`

Bisect the two hops — **check the upstream before blaming `portproxy`/firewall.** The most
common cause is a *wedged dev server*, not a networking fault: a long-running `dev:phone`
can stop serving while its socket stays `LISTEN`, so `portproxy` faithfully forwards to a
dead upstream and nothing loads anywhere.

1. **Is the WSL server actually serving?** Inside WSL:
   ```bash
   curl -m5 -o/dev/null -w '%{http_code}\n' http://127.0.0.1:3000          # want 200
   curl -m5 -o/dev/null -w '%{http_code}\n' http://$(hostname -I | awk '{print $1}'):3000  # want 200
   ss -ltn 'sport = :3000'   # LISTEN with Recv-Q 0; a nonzero Recv-Q backlog = wedged
   ```
   `000` or a piling `Recv-Q` means the server is hung — kill it and relaunch:
   ```bash
   pkill -9 -f 'next dev'; npm run dev:phone
   ```
   The second `curl` matters because `portproxy` targets the **WSL eth0 IP**, not
   `localhost`; both must answer `200`.
2. **Only if the upstream serves locally**, check the Windows side (elevated PowerShell):
   the `portproxy` `connectaddress` must equal the *current* `wsl hostname -I` (WSL's IP
   drifts across restarts — re-run `wsl-port-forward.ps1` if stale), and the `WSL dev:3000`
   firewall rule must exist.
3. **Only if the host browser loads it but the phone doesn't**, it's the wifi: confirm the
   phone is on the same SSID/subnet and the network isn't using AP/client isolation.

### `cannot execute binary file: Exec format error` running `explorer.exe` / `e .` / a `.ps1`

WSL2 + `systemd=true` intermittently loses the `WSLInterop` binfmt handler at boot (a race
between WSL's `/init` and systemd mounting `proc-sys-fs-binfmt_misc`). It's flaky by design
— fine some boots, broken others — and unrelated to the distro version. Confirm with
`cat /proc/sys/fs/binfmt_misc/WSLInterop` (absent when broken, though `status` says
`enabled`).

Immediate unstick:
```bash
sudo sh -c 'echo ":WSLInterop:M::MZ::/init:PF" > /proc/sys/fs/binfmt_misc/register'
```

Persistent fix — a one-shot systemd unit that re-registers it after the binfmt mount, only
if missing, on every boot:
```bash
sudo tee /etc/systemd/system/wsl-interop.service >/dev/null <<'EOF'
[Unit]
Description=Re-register WSLInterop binfmt handler (WSL+systemd boot race workaround)
After=proc-sys-fs-binfmt_misc.mount
ConditionPathExists=/init

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c 'test -e /proc/sys/fs/binfmt_misc/WSLInterop || echo ":WSLInterop:M::MZ::/init:PF" > /proc/sys/fs/binfmt_misc/register'

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable wsl-interop.service
```

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
