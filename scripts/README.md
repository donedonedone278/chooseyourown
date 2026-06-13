# scripts/

Small helpers so regularly-used, multi-step commands live in one place instead of as
`&&` chains in the docs.

## `dev-phone.sh` — `npm run dev:phone`

Starts the Next dev server bound to `0.0.0.0` (reachable beyond the WSL2 VM) and prints
the `http://<windows-LAN-IP>:3000` URL to open on a phone on the same wifi. Also
sanity-checks the Windows port-forward and warns if it's stale or missing. This is the
standard way to run the app for phone testing — `npm run dev` stays localhost-only.

## LAN access from a phone (one-time Windows setup)

The phone reaches the WSL2 dev server through two hops: **WSL2 → Windows** (the server
binds `0.0.0.0`, handled by `dev:phone`) and **Windows → phone** (a Windows `portproxy`
+ firewall rule forwarding the LAN port into the WSL2 VM). WSL2's internal IP changes on
every restart, so the forward is re-applied automatically at each Windows logon.

The two PowerShell scripts here are the version-controlled source of truth. The **active
copies run from the Windows user profile** (`C:\Users\<you>\`), not from this repo —
running a `.ps1` off the WSL filesystem at logon is unreliable (WSL may not be up yet).

**Install once** (copy to the Windows profile, then run elevated):

```powershell
# From an elevated PowerShell on Windows:
Copy-Item \\wsl$\Ubuntu\home\<you>\repos\chooseyourown\scripts\windows\*.ps1 $env:USERPROFILE\
& "$env:USERPROFILE\wsl-port-forward-setup.ps1"
```

- `wsl-port-forward.ps1` — detects the current WSL2 IP and (re)applies the
  `portproxy` + firewall rule for port 3000. Idempotent; safe to re-run.
- `wsl-port-forward-setup.ps1` — registers a logon scheduled task that runs the above
  (elevated, no recurring UAC prompt), then runs it once immediately.

**Teardown:**

```powershell
Unregister-ScheduledTask -TaskName 'WSL Port Forward 3000' -Confirm:$false
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
Remove-NetFirewallRule -DisplayName 'WSL dev:3000'
```

> Assumptions: home wifi, all users trusted, plain HTTP (no TLS). `src/lib/auth.ts` sets
> `trustHost: true` and cookies aren't `Secure`-flagged, so auth works over LAN HTTP.
> Don't use this on an untrusted network.
