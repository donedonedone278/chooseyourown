#!/usr/bin/env bash
# Print the URL to open the dev server from a phone on the same wifi — and nothing
# else (no server start). Handy after backgrounding `npm run dev:phone`, whose
# startup banner is easy to miss in a captured log: just run `npm run phone:url`.
#
# Best-effort: uses Windows interop to find the LAN IP the phone connects to, and
# falls back to the WSL IP (then a clear message) so it degrades on non-WSL hosts
# instead of crashing. See scripts/README.md.
set -uo pipefail

PORT="${PORT:-3000}"

# Windows LAN IP (what the phone connects to), via PowerShell interop when present.
win_ip="$(powershell.exe -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -notlike '169.254.*' -and \$_.InterfaceAlias -notmatch 'Loopback|WSL|vEthernet' } | Select-Object -First 1).IPAddress" 2>/dev/null | tr -d '\r\n ' || true)"

# Fall back to the WSL/host IP if Windows interop isn't available.
if [ -z "$win_ip" ]; then
  win_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

if [ -z "$win_ip" ]; then
  echo "Could not determine a LAN IP for the phone URL (no Windows interop, no host IP)." >&2
  exit 1
fi

echo "http://$win_ip:$PORT"
