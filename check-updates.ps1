# CrestronAISkills - Check for skill updates
# Run this script manually to check all installed skills for available updates.
# Usage: ~/.copilot/skills/check-updates.ps1

$RegistryUrl = "https://friendly-system-1qwlq3v.pages.github.io/registry.json"
$InstallDir  = "$env:USERPROFILE\.copilot\instructions"

if (-not (Test-Path $InstallDir)) {
    Write-Host "No skills installed (directory not found: $InstallDir)" -ForegroundColor Yellow
    exit 0
}

# Fetch the registry
Write-Host "Fetching registry from $RegistryUrl ..." -ForegroundColor Cyan
try {
    $registry = Invoke-RestMethod $RegistryUrl
} catch {
    Write-Host "ERROR: Could not fetch registry: $_" -ForegroundColor Red
    exit 1
}

$mdFiles = Get-ChildItem $InstallDir -Filter "*.md" -File
if ($mdFiles.Count -eq 0) {
    Write-Host "No skill files found in $InstallDir" -ForegroundColor Yellow
    exit 0
}

foreach ($file in $mdFiles) {
    $lines    = Get-Content $file.FullName
    $fm       = @{}
    $inFm     = $false

    foreach ($line in $lines) {
        if ($line -eq '---' -and -not $inFm) { $inFm = $true; continue }
        if ($line -eq '---' -and $inFm)      { break }
        if ($inFm -and ($line -match '^(\w+):\s*(.*)$')) {
            $fm[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }

    if (-not $fm['name']) { continue }

    $installedName    = $fm['name']
    $installedVersion = $fm['version']

    $entry = $registry.skills | Where-Object { $_.name -eq $installedName } | Select-Object -First 1

    if (-not $entry) {
        Write-Host "  ⚠ $installedName — not found in registry (may be a local-only skill)" -ForegroundColor DarkYellow
        continue
    }

    if ($entry.version -eq $installedVersion) {
        Write-Host "  ✅ $installedName is up to date (v$installedVersion)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $installedName has an update: v$installedVersion → v$($entry.version)" -ForegroundColor Yellow
        $answer = Read-Host "     Update $installedName? (y/n)"
        if ($answer -match '^[Yy]') {
            $skillUrl = "https://friendly-system-1qwlq3v.pages.github.io/skills/$installedName/skill.md"
            try {
                Invoke-WebRequest $skillUrl -OutFile $file.FullName -UseBasicParsing
                Write-Host "     ✅ Updated $installedName to v$($entry.version)" -ForegroundColor Green
            } catch {
                Write-Host "     ERROR: Could not download update: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "     Skipped." -ForegroundColor DarkGray
        }
    }
}
