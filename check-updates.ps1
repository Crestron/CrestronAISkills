# CrestronAISkills - Check for skill updates
# Run this script manually to check all installed skills for available updates.
# Usage: powershell -File check-updates.ps1

$RegistryUrl = "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/registry.json"
$PagesUrl    = "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main"
$ConfigDir   = "$env:USERPROFILE\.copilot\skills"

Write-Host "`nCrestronAISkills — Checking for updates..." -ForegroundColor Cyan
Write-Host ("─" * 50)

# Find installed skills via config files
$configs = @()
if (Test-Path $ConfigDir) {
    $configs = Get-ChildItem $ConfigDir -Filter "*-config.json" -File
}

if ($configs.Count -eq 0) {
    Write-Host "No installed skills found. Download and run install.ps1 from the marketplace." -ForegroundColor Yellow
    exit 0
}

# Fetch the registry
try {
    $registry = Invoke-RestMethod $RegistryUrl -UseBasicParsing
} catch {
    Write-Host "ERROR: Could not fetch registry: $_" -ForegroundColor Red
    exit 1
}

foreach ($configFile in $configs) {
    $config = Get-Content $configFile.FullName | ConvertFrom-Json
    $name    = $config.name
    $version = $config.version
    $destMd  = Join-Path $config.projectPath ".github\skills\$name\skill.md"

    $entry = $registry.skills | Where-Object { $_.name -eq $name } | Select-Object -First 1

    if (-not $entry) {
        Write-Host "  ? $name — not found in registry" -ForegroundColor DarkYellow
        continue
    }

    if ($entry.version -eq $version) {
        Write-Host "  ✅ $name v$version — up to date" -ForegroundColor Green
    } else {
        Write-Host "  ⚠  $name — update available: v$version → v$($entry.version)" -ForegroundColor Yellow
        Write-Host "     Project: $($config.projectPath)"
        $answer = Read-Host "     Update now? (y/n)"
        if ($answer -match '^[Yy]') {
            $skillUrl = "$PagesUrl/skills/$name/skill.md"
            try {
                Invoke-WebRequest $skillUrl -OutFile $destMd -UseBasicParsing
                $config.version = $entry.version
                $config | ConvertTo-Json | Set-Content $configFile.FullName -Encoding UTF8
                Write-Host "     ✅ Updated to v$($entry.version)" -ForegroundColor Green
            } catch {
                Write-Host "     ERROR: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "     Skipped." -ForegroundColor DarkGray
        }
    }
}

Write-Host ""

