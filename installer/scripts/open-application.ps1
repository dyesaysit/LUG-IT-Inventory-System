param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$dataDir = if ($env:INVENTORY_DATA_DIR) { $env:INVENTORY_DATA_DIR } else { Join-Path $env:ProgramData 'IT-Inventory-Server' }
$portFile = Join-Path $dataDir 'config\port.txt'
$port = if ($env:INVENTORY_PORT) { [int]$env:INVENTORY_PORT }
        elseif (Test-Path $portFile) { [int]((Get-Content -Raw $portFile).Trim()) }
        else { 3000 }
$healthUrl = "http://127.0.0.1:$port/api/health"
$appUrl = "http://127.0.0.1:$port"

for ($attempt = 0; $attempt -lt 90; $attempt += 1) {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $health = $response.Content | ConvertFrom-Json
      $targetUrl = if ($health.setupRequired) { "$appUrl/setup" } else { $appUrl }
      if ($NoOpen) { Write-Output $targetUrl } else { Start-Process $targetUrl }
      exit 0
    }
  } catch {}
  Start-Sleep -Milliseconds 500
}

# Fallback: open the app anyway so the browser always launches. The server redirects
# '/' to '/setup' on first run, so initial setup still works once it finishes starting.
if ($NoOpen) { Write-Output $appUrl } else { Start-Process $appUrl }
exit 0
