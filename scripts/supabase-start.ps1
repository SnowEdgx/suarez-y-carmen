param(
  [switch]$Restart
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot "supabase\.env.local"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) { return }

    $key = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    Set-Item -Path "Env:$key" -Value $value
  }
} else {
  Write-Warning "No existe $envPath. Crea el archivo copiando supabase/.env.example."
}

Push-Location $repoRoot
try {
  if ($Restart) {
    npx supabase stop --project-id suarez-y-carmen
  }
  npx supabase start
} finally {
  Pop-Location
}
