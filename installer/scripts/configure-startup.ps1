param([string]$LauncherPath = (Join-Path $PSScriptRoot 'launcher.ps1'))
$ErrorActionPreference = 'Stop'
$taskName = 'IT Inventory Server'
$dataDir = Join-Path $env:ProgramData 'IT-Inventory-Server'
$logDirectory = Join-Path $dataDir 'logs'
$logPath = Join-Path $logDirectory 'startup-task-install.log'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$LauncherPath`" -ServerOnly"

$portFile = Join-Path $dataDir 'config\port.txt'
$port = if ($env:INVENTORY_PORT) { [int]$env:INVENTORY_PORT }
        elseif (Test-Path $portFile) { [int]((Get-Content -Raw $portFile).Trim()) }
        else { 3000 }
$healthUrl = "http://127.0.0.1:$port/api/health"

try {
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  "$(Get-Date -Format o) Registered and started task using $LauncherPath (port $port)" | Set-Content -Path $logPath

  # Wait for the backend to become healthy so the Finish page can open the browser
  # straight to a working page (the first run also applies database migrations).
  $healthy = $false
  for ($i = 0; $i -lt 120; $i += 1) {
    try {
      if ((Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $healthy = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 1000
  }
  "$(Get-Date -Format o) Backend healthy: $healthy" | Add-Content -Path $logPath
} catch {
  "$(Get-Date -Format o) $($_.Exception.Message)" | Add-Content -Path $logPath
  throw
}
