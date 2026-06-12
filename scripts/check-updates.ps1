# CrestronAISkills - Check for skill updates
# Run this script manually to check all installed skills for available updates.
# Usage: powershell -File check-updates.ps1

$RegistryUrl = "https://crestron.github.io/CrestronAISkills/registry.json"
$PagesUrl    = "https://crestron.github.io/CrestronAISkills"
$ConfigDirs  = @("$env:USERPROFILE\.copilot\skills", "$env:USERPROFILE\.claude\skills")

Write-Host "`nCrestronAISkills — Checking for updates..." -ForegroundColor Cyan
Write-Host ("─" * 50)

# Collect unique config files from both dirs (deduplicate by skill name)
$seenNames = @{}
$configs = @()
foreach ($dir in $ConfigDirs) {
    if (-not (Test-Path $dir)) { continue }
    foreach ($f in (Get-ChildItem $dir -Filter "*-config.json" -File)) {
        $n = (Get-Content $f.FullName | ConvertFrom-Json).name
        if (-not $seenNames.ContainsKey($n)) {
            $seenNames[$n] = $true
            $configs += $f
        }
    }
}

if ($configs.Count -eq 0) {
    Write-Host "No installed skills found. Download and run install.ps1 from the marketplace." -ForegroundColor Yellow
    exit 0
}

try {
    $registry = Invoke-RestMethod $RegistryUrl -UseBasicParsing
} catch {
    Write-Host "ERROR: Could not fetch registry: $_" -ForegroundColor Red
    exit 1
}

foreach ($configFile in $configs) {
    $config  = Get-Content $configFile.FullName | ConvertFrom-Json
    $name    = $config.name
    $version = $config.version
    $copilotDest = Join-Path $config.projectPath ".github\skills\$name\skill.md"
    $claudeDest  = Join-Path $config.projectPath ".claude\commands\$name.md"

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
            try {
                $tmp = [System.IO.Path]::GetTempFileName()
                Invoke-WebRequest "$PagesUrl/skills/$name/skill.md" -OutFile $tmp -UseBasicParsing
                # Update Copilot skill
                New-Item -ItemType Directory -Force -Path (Split-Path -Parent $copilotDest) | Out-Null
                Copy-Item $tmp $copilotDest -Force
                # Update Claude Code command if present
                if (Test-Path $claudeDest) {
                    $lines = Get-Content $tmp
                    $dashes = @($lines | Select-String '^---$' | Select-Object -ExpandProperty LineNumber)
                    if ($dashes.Count -ge 2) { $lines[($dashes[1])..($lines.Length-1)] | Set-Content $claudeDest -Encoding UTF8 }
                    else { Copy-Item $tmp $claudeDest -Force }
                }
                Remove-Item $tmp -Force
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
