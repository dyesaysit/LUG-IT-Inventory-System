param([switch]$StageOnly)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$installerDir = Join-Path $root 'installer'; $stage = Join-Path $installerDir 'staging-package'; $output = Join-Path $installerDir 'output'
Set-Location $root
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'app\backend\dist\database'), (Join-Path $stage 'app\frontend'), (Join-Path $stage 'app\shared'), (Join-Path $stage 'app\runtime'), (Join-Path $stage 'app\scripts'), $output | Out-Null
Copy-Item backend/dist (Join-Path $stage 'app\backend') -Recurse -Force
Copy-Item backend/src/database/migrations (Join-Path $stage 'app\backend\dist\database') -Recurse -Force
Copy-Item backend/package.json (Join-Path $stage 'app\backend\package.json')
Copy-Item frontend/dist (Join-Path $stage 'app\frontend') -Recurse -Force
Copy-Item shared/dist (Join-Path $stage 'app\shared') -Recurse -Force
Copy-Item shared/package.json (Join-Path $stage 'app\shared\package.json')
Copy-Item installer/scripts/launcher.ps1 (Join-Path $stage 'app\scripts\launcher.ps1') -Force
Copy-Item installer/scripts/open-application.ps1 (Join-Path $stage 'app\scripts\open-application.ps1') -Force
Copy-Item installer/scripts/configure-startup.ps1 (Join-Path $stage 'app\scripts\configure-startup.ps1') -Force
Copy-Item installer/scripts/configure-firewall.ps1 (Join-Path $stage 'app\scripts\configure-firewall.ps1') -Force
Copy-Item (Get-Command node.exe).Source (Join-Path $stage 'app\runtime\node.exe') -Force
Push-Location (Join-Path $stage 'app\backend')
npm.cmd install --omit=dev --workspaces=false --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Production dependency staging failed.' }
$stagedNode = Join-Path $stage 'app\runtime\node.exe'
& $stagedNode -e "const Database=require('better-sqlite3');const db=new Database(':memory:');db.exec('CREATE TABLE installer_check(id INTEGER)');db.close();console.log('Bundled SQLite runtime verified.')"
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'The bundled better-sqlite3 native runtime could not be loaded. Installer creation was aborted.' }
Pop-Location
if ($StageOnly) {
  Write-Output "Installer staging package verified at $stage"
  exit 0
}
$isccCommand = Get-Command ISCC.exe -ErrorAction SilentlyContinue
$isccCandidates = @(
  $isccCommand.Source
  (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe')
  (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
  (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe')
)
$iscc = $isccCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $iscc) { throw 'Inno Setup 6 compiler was not found. Install Inno Setup 6, then run npm run build:installer again.' }
& $iscc (Join-Path $installerDir 'setup.iss')
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup compilation failed.' }
