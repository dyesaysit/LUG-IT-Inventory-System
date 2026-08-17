param([switch]$Stop, [switch]$ServerOnly)
$ErrorActionPreference = 'Stop'
$appDir = Split-Path -Parent $PSScriptRoot
$preferredDataDir = Join-Path $env:ProgramData 'IT-Inventory-Server'
$dataDir = if ($env:INVENTORY_DATA_DIR) { $env:INVENTORY_DATA_DIR } else { $preferredDataDir }
$logDir = Join-Path $dataDir 'logs'
$pidFile = Join-Path $dataDir 'backend.pid'
$portFile = Join-Path $dataDir 'config\port.txt'
$port = if ($env:INVENTORY_PORT) { [int]$env:INVENTORY_PORT }
        elseif (Test-Path $portFile) { [int]((Get-Content -Raw $portFile).Trim()) }
        else { 3000 }
$healthUrl = "http://127.0.0.1:$port/api/health"
$appUrl = "http://127.0.0.1:$port"
function Open-Application([object]$healthResponse) {
  $health = $healthResponse.Content | ConvertFrom-Json
  $targetUrl = if ($health.setupRequired) { "$appUrl/setup" } else { $appUrl }
  Start-Process $targetUrl
}
New-Item -ItemType Directory -Force -Path $dataDir, $logDir, (Join-Path $dataDir 'backups'), (Join-Path $dataDir 'branding') | Out-Null
if ($Stop) {
  if (Test-Path $pidFile) {
    $backendPid = [int](Get-Content -Raw $pidFile)
    Stop-Process -Id $backendPid -ErrorAction SilentlyContinue
    Wait-Process -Id $backendPid -Timeout 15 -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  }
  # Also stop any backend still running from THIS installation's bundled Node runtime
  # (e.g. one started by the boot task), so file handles are released before the
  # uninstaller deletes program files. Path-scoped so other Node apps are untouched.
  $stopNodePath = Join-Path $appDir 'runtime\node.exe'
  $stragglers = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.ExecutablePath -and ($_.ExecutablePath -ieq $stopNodePath) }
  foreach ($proc in $stragglers) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    Wait-Process -Id $proc.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
  }
  # Give Windows a moment to release the native-module file locks.
  Start-Sleep -Milliseconds 750
  exit 0
}
# A healthy server may already be running (for example, started by the boot task).
# In that case just open the browser rather than trying to start a second copy.
try {
  $alreadyUp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
  if ($alreadyUp.StatusCode -eq 200) { if (-not $ServerOnly) { Open-Application $alreadyUp }; exit 0 }
} catch {}
if (Test-Path $pidFile) {
  $existingPid = [int](Get-Content -Raw $pidFile)
  if (Get-Process -Id $existingPid -ErrorAction SilentlyContinue) {
    for ($attempt = 0; $attempt -lt 10; $attempt += 1) {
      try { $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { if (-not $ServerOnly) { Open-Application $response }; exit 0 } } catch {}
      Start-Sleep -Milliseconds 500
    }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
$portOccupied = $false
try {
  $portResponse = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
  $portOccupied = $portResponse.StatusCode -eq 200
} catch {}
if ($portOccupied) {
  throw "Port $port is already in use by another Inventory server. Stop the other server before launching this installation."
}
$env:NODE_ENV = 'production'; $env:PORT = "$port"; $env:HOST = '0.0.0.0'; $env:COOKIE_SECURE = 'false'
$env:DATABASE_PATH = Join-Path $dataDir 'inventory.sqlite'
$env:BACKUP_DIRECTORY = Join-Path $dataDir 'backups'
$env:APPLICATION_DATA_DIR = $dataDir
$env:APP_NAME = 'IT Inventory Server'
$canonicalPath = [Environment]::GetEnvironmentVariable('Path', 'Process')
[Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
[Environment]::SetEnvironmentVariable('Path', $canonicalPath, 'Process')
$nodePath = Join-Path $appDir 'runtime\node.exe'; $backendDir = Join-Path $appDir 'backend'
$stdoutLog = Join-Path $logDir 'backend.log'; $stderrLog = Join-Path $logDir 'backend-error.log'
$process = Start-Process -FilePath $nodePath -ArgumentList 'dist/server.js' -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
Set-Content -Path $pidFile -Value $process.Id
for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
  if ($process.HasExited) { Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue; throw "Backend exited during startup. See $stderrLog" }
  try { $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { if (-not $ServerOnly) { Open-Application $response }; exit 0 } } catch {}
  Start-Sleep -Milliseconds 500
}
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
throw "Backend did not become healthy. See $stderrLog"
