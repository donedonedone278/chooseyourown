# Forwards a LAN port on this Windows host to the current WSL2 VM, so devices on the
# home wifi (e.g. a phone) can reach a dev server running inside WSL2.
#
# WSL2's internal IP changes on every restart, so this script re-detects it and
# replaces the portproxy rule each time it runs. Designed to be run elevated, either
# manually or via the scheduled task created by wsl-port-forward-setup.ps1.

param(
    [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

$wslIp = (wsl.exe hostname -I).Trim().Split(' ')[0]
if (-not $wslIp) {
    throw "Could not determine WSL2 IP address (is WSL running?)"
}

# Remove any existing rule for this port, then add one pointing at the current WSL IP.
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$wslIp | Out-Null

# Ensure a firewall rule allows inbound traffic on this port (idempotent).
$ruleName = "WSL dev:$Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
}

Write-Output "Forwarding 0.0.0.0:$Port -> ${wslIp}:$Port"
Write-Output "Reach it from your phone at one of these addresses (port $Port):"
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'Loopback|WSL|vEthernet' } |
    ForEach-Object { Write-Output "  http://$($_.IPAddress):$Port" }
