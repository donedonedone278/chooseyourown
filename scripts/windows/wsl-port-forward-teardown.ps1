# Fully removes the WSL2 -> LAN port-forwarding setup created by
# wsl-port-forward-setup.ps1 / wsl-port-forward.ps1. Run once from an ELEVATED
# PowerShell. Idempotent: safe to run even if some pieces are already gone.
#
# This reverses ALL system state the setup created:
#   1. the logon scheduled task        ("WSL Port Forward <port>")
#   2. the netsh portproxy rule         (0.0.0.0:<port> -> WSL)
#   3. the inbound firewall rule        ("WSL dev:<port>")
#   4. the two helper scripts copied into the Windows user profile
#
# It does NOT touch the repo (delete scripts/windows/ and the "dev:phone" npm
# script via git separately) and does NOT change any app code — LAN access never
# required any.

param(
    [int]$Port = 3000
)

$taskName = "WSL Port Forward $Port"
$ruleName = "WSL dev:$Port"

Write-Output "Removing WSL port-forward setup for port $Port ..."

# 1. Scheduled task
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output "  - removed scheduled task '$taskName'"
} else {
    Write-Output "  - scheduled task '$taskName' not present"
}

# 2. portproxy rule
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>$null | Out-Null
Write-Output "  - removed portproxy rule on 0.0.0.0:$Port (if any)"

# 3. firewall rule
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
    Remove-NetFirewallRule -DisplayName $ruleName
    Write-Output "  - removed firewall rule '$ruleName'"
} else {
    Write-Output "  - firewall rule '$ruleName' not present"
}

# 4. helper scripts copied into the Windows user profile
foreach ($name in 'wsl-port-forward.ps1', 'wsl-port-forward-setup.ps1') {
    $path = Join-Path $env:USERPROFILE $name
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Output "  - deleted $path"
    }
}

Write-Output "Done. You can now delete this teardown script too, and remove"
Write-Output "scripts/windows/ + the 'dev:phone' npm script from the repo via git."
