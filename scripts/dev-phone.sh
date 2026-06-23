#!/usr/bin/env bash
# Start the Next dev server so it's reachable from a phone on the same wifi, and
# print the URL to open. One command instead of the
# "export PATH=... && next dev --hostname 0.0.0.0" incantation: `npm run dev:phone`.
#
# Windows-side port forwarding (WSL2 -> LAN) is handled by the logon task installed
# via scripts/windows/wsl-port-forward-setup.ps1; this script only sanity-checks it.
set -euo pipefail

# Volta shims aren't on PATH in non-interactive shells (see CLAUDE.md "Environment").
export PATH="$HOME/.volta/bin:$PATH"

PORT="${PORT:-3000}"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

wsl_ip="$(hostname -I | awk '{print $1}')"

# Windows LAN IP (what the phone connects to) and the current portproxy target.
# Best-effort via PowerShell; never fatal if Windows interop is unavailable.
win_ip="$(powershell.exe -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -notlike '169.254.*' -and \$_.InterfaceAlias -notmatch 'Loopback|WSL|vEthernet' } | Select-Object -First 1).IPAddress" 2>/dev/null | tr -d '\r\n ' || true)"
proxy_target="$(powershell.exe -NoProfile -Command "netsh interface portproxy show v4tov4" 2>/dev/null | tr -d '\r' | awk -v p="$PORT" '$2==p {print $3}' | head -n1 || true)"

echo
[ -n "$win_ip" ] && echo "  📱 Phone (same wifi):  http://$win_ip:$PORT"
echo "  💻 This machine:       http://localhost:$PORT"
echo

if [ -n "$proxy_target" ] && [ "$proxy_target" != "$wsl_ip" ]; then
  echo "  ⚠  Windows forwards :$PORT to $proxy_target but WSL is now $wsl_ip."
  echo "     Phone access will fail until the forward is refreshed. In an elevated"
  echo "     PowerShell run: C:\\Users\\$USER\\wsl-port-forward.ps1  (or just log out/in)."
  echo
elif [ -z "$proxy_target" ]; then
  echo "  ⚠  No Windows port-forward for :$PORT found. Run the one-time setup:"
  echo "     scripts/windows/wsl-port-forward-setup.ps1 (elevated PowerShell)."
  echo
fi

# Tee the server's stdout+stderr to next-dev.log (gitignored, repo root) so
# server-side errors are always grep-able without restarting — a request that
# 500s prints its stack there. Fresh file each start; tee still forwards output
# to stdout so the banner/background capture keep working.
exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port "$PORT" > >(tee next-dev.log) 2>&1
