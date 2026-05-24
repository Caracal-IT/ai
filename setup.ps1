<#
.SYNOPSIS
  Bootstrap script for Caracal-IT/ai on Windows.
.DESCRIPTION
  Creates the npm global-prefix directory when it is missing (a common
  first-run issue on Windows) and then forwards every argument to
  npx github:Caracal-IT/ai.
.EXAMPLE
  .\setup.ps1 init ./my-project
  .\setup.ps1 update
#>

# Ensure the npm global-prefix directory exists
$npmDir = Join-Path $env:APPDATA 'npm'
if (-not (Test-Path $npmDir)) {
  New-Item -ItemType Directory -Force $npmDir | Out-Null
  Write-Host "Created missing npm directory: $npmDir"
}

# Forward all arguments to npx
npx github:Caracal-IT/ai @args
