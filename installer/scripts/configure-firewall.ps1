param([int]$Port = 0, [string]$NodePath = '', [switch]$Interactive)
$ErrorActionPreference = 'SilentlyContinue'
$name = 'IT Inventory Server'
$dataDir = Join-Path $env:ProgramData 'IT-Inventory-Server'

# When launched interactively (the "Repair Remote Access" shortcut), self-elevate so the
# firewall / network-profile changes actually apply.
if ($Interactive) {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Interactive"
    return
  }
}

if ($Port -le 0) {
  $portFile = Join-Path $dataDir 'config\port.txt'
  $Port = if (Test-Path $portFile) { [int]((Get-Content -Raw $portFile).Trim()) } else { 3000 }
}
if (-not $NodePath) {
  $guess = Join-Path (Split-Path -Parent $PSScriptRoot) 'runtime\node.exe'
  if (Test-Path $guess) { $NodePath = $guess }
}

# Clean slate: remove our previous rules (prevents duplicates) and any INBOUND BLOCK rules
# targeting our node.exe (a block rule would override the allow rules below).
Get-NetFirewallRule -DisplayName "$name*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
if ($NodePath -and (Test-Path $NodePath)) {
  Get-NetFirewallApplicationFilter -Program $NodePath -ErrorAction SilentlyContinue |
    Get-NetFirewallRule -ErrorAction SilentlyContinue |
    Where-Object { $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' } |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
}

# Allow inbound on ALL profiles (Domain, Private AND Public) two ways:
#  - by TCP port (any program)
#  - by program (the bundled node.exe), belt-and-suspenders
New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Any -Enabled True -ErrorAction SilentlyContinue | Out-Null
if ($NodePath -and (Test-Path $NodePath)) {
  New-NetFirewallRule -DisplayName "$name (app)" -Direction Inbound -Action Allow -Program $NodePath -Profile Any -Enabled True -ErrorAction SilentlyContinue | Out-Null
}

if (-not $Interactive) { return }

# ---- Interactive repair / diagnostics ----
Write-Host ''
Write-Host 'IT Inventory Server - Remote Access Repair' -ForegroundColor Cyan
Write-Host "Listening port: $Port"
Write-Host '[OK] Firewall now allows inbound on all network profiles.' -ForegroundColor Green
Write-Host ''

# Public networks block inbound by default; switch them to Private for LAN access.
Get-NetConnectionProfile -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ("Network '{0}': {1}" -f $_.Name, $_.NetworkCategory)
  if ($_.NetworkCategory -eq 'Public') {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue
    Write-Host '   -> changed to Private' -ForegroundColor Green
  }
}

$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  Write-Host ("`n[OK] Server is listening on {0}:{1}" -f (@($listen.LocalAddress) -join ', '), $Port) -ForegroundColor Green
} else {
  Write-Host "`n[!] The server is not listening yet. Launch it from the desktop shortcut, then run this again." -ForegroundColor Yellow
}

Write-Host "`nOpen this on your phone (connected to the SAME Wi-Fi):" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  ForEach-Object { Write-Host ("   http://{0}:{1}" -f $_.IPAddress, $Port) -ForegroundColor White }

Write-Host "`nIf it STILL fails from the phone, the server/PC is fine - your Wi-Fi router has" -ForegroundColor Yellow
Write-Host "'AP isolation' / 'client isolation' on (common on Guest networks). Connect both" -ForegroundColor Yellow
Write-Host "devices to the main (non-guest) network, or disable client isolation on the router." -ForegroundColor Yellow
Read-Host "`nPress Enter to close"
