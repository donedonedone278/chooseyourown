# One-time setup: registers a scheduled task that re-applies the WSL2 port-forwarding
# rule (wsl-port-forward.ps1) at user logon, running elevated so it never prompts UAC
# again. Run this once from an elevated PowerShell (or let it self-elevate via
# wsl-port-forward-launch.ps1).

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'wsl-port-forward.ps1'
$taskName = 'WSL Port Forward 3000'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Output "Registered scheduled task '$taskName' to run at logon."

# Run it immediately so it's active right now too.
& $scriptPath
