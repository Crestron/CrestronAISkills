# CrestronAISkills - Skill Installer (Windows)
# Requires: Windows PowerShell 5.1+ (built-in on Windows 10/11)
# Placeholders replaced at download time: __SKILL_NAME__, __SKILL_VERSION__, __REGISTRY_URL__, __PAGES_URL__

param(
    [string]$ProjectPath = ""
)

$skillName    = "__SKILL_NAME__"
$skillVersion = "__SKILL_VERSION__"
$registryUrl  = "__REGISTRY_URL__"
$pagesUrl     = "__PAGES_URL__"

Write-Host "`nCrestronAISkills — Installing: $skillName v$skillVersion" -ForegroundColor Cyan
Write-Host ("─" * 50)

$configDir = Join-Path $env:USERPROFILE ".copilot\skills"
$claudeConfigDir = Join-Path $env:USERPROFILE ".claude\skills"
if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Force -Path $configDir | Out-Null }
if (-not (Test-Path $claudeConfigDir)) { New-Item -ItemType Directory -Force -Path $claudeConfigDir | Out-Null }

# 1. Get project path
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $defaultPath = (Get-Location).Path
    $inputPath = Read-Host "`nEnter your project root path (press Enter for: $defaultPath)"
    if ([string]::IsNullOrWhiteSpace($inputPath)) { $inputPath = $defaultPath }
    $ProjectPath = $inputPath
}
if (-not (Test-Path $ProjectPath)) { Write-Host "ERROR: Path not found." -ForegroundColor Red; exit 1 }
$ProjectPath = (Resolve-Path $ProjectPath).Path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 2. Install for GitHub Copilot → .github\skills\<name>\skill.md
$copilotDest = Join-Path $ProjectPath ".github\skills\$skillName\skill.md"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $copilotDest) | Out-Null
Copy-Item (Join-Path $scriptDir "skill.md") $copilotDest -Force
Write-Host "  Copilot: installed to $copilotDest"

# 3. Install for Claude Code → .claude\commands\<name>.md (body only, no frontmatter)
$claudeDest = Join-Path $ProjectPath ".claude\commands\$skillName.md"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $claudeDest) | Out-Null
$lines = Get-Content (Join-Path $scriptDir "skill.md")
$dashes = @($lines | Select-String '^---$' | Select-Object -ExpandProperty LineNumber)
if ($dashes.Count -ge 2) {
    $lines[($dashes[1])..$($lines.Length - 1)] | Set-Content $claudeDest -Encoding UTF8
} else {
    Copy-Item (Join-Path $scriptDir "skill.md") $claudeDest -Force
}
Write-Host "  Claude Code: installed to $claudeDest (available as /$skillName)"

# 4. Save config (to both Copilot and Claude Code config dirs)
$configPath = Join-Path $configDir "$skillName-config.json"
$configJson = [ordered]@{
    name        = $skillName
    version     = $skillVersion
    projectPath = $ProjectPath
    registryUrl = $registryUrl
    pagesUrl    = $pagesUrl
    installedAt = (Get-Date -Format 'o')
} | ConvertTo-Json
$configJson | Set-Content $configPath -Encoding UTF8
$configJson | Set-Content (Join-Path $claudeConfigDir "$skillName-config.json") -Encoding UTF8

# 4b. Download check-updates scripts to both config dirs
try {
    $ps1Content = Invoke-WebRequest "$pagesUrl/scripts/check-updates.ps1" -UseBasicParsing
    $ps1Content.Content | Set-Content (Join-Path $configDir "check-updates.ps1") -Encoding UTF8
    $ps1Content.Content | Set-Content (Join-Path $claudeConfigDir "check-updates.ps1") -Encoding UTF8
    Write-Host "  check-updates.ps1 saved to $configDir and $claudeConfigDir"
} catch { Write-Host "  Warning: could not download check-updates.ps1" -ForegroundColor Yellow }
try {
    $shContent = Invoke-WebRequest "$pagesUrl/scripts/check-updates.sh" -UseBasicParsing
    $shContent.Content | Set-Content (Join-Path $configDir "check-updates.sh") -Encoding UTF8
    $shContent.Content | Set-Content (Join-Path $claudeConfigDir "check-updates.sh") -Encoding UTF8
    Write-Host "  check-updates.sh saved to $configDir and $claudeConfigDir"
} catch { Write-Host "  Warning: could not download check-updates.sh" -ForegroundColor Yellow }

# 5. Write update script
$updateScriptPath = Join-Path $configDir "update-$skillName.ps1"
@"
`$c = Get-Content '$configPath' | ConvertFrom-Json
try { `$r = Invoke-RestMethod `$c.registryUrl -UseBasicParsing } catch { exit 1 }
`$l = `$r.skills | Where-Object { `$_.name -eq `$c.name } | Select-Object -First 1
if (-not `$l -or `$l.version -eq `$c.version) { exit 0 }
`$tmp = [System.IO.Path]::GetTempFileName()
Invoke-WebRequest "`$(`$c.pagesUrl)/skills/`$(`$c.name)/skill.md" -OutFile `$tmp -UseBasicParsing
# Update Copilot skill
`$copilot = Join-Path `$c.projectPath ".github\skills\`$(`$c.name)\skill.md"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent `$copilot) | Out-Null
Copy-Item `$tmp `$copilot -Force
# Update Claude Code command if present
`$claude = Join-Path `$c.projectPath ".claude\commands\`$(`$c.name).md"
if (Test-Path `$claude) {
    `$lines = Get-Content `$tmp
    `$dashes = @(`$lines | Select-String '^---$' | Select-Object -ExpandProperty LineNumber)
    if (`$dashes.Count -ge 2) { `$lines[(`$dashes[1])..(`$lines.Length-1)] | Set-Content `$claude -Encoding UTF8 }
    else { Copy-Item `$tmp `$claude -Force }
}
Remove-Item `$tmp -Force
`$c.version = `$l.version; `$c | ConvertTo-Json | Set-Content '$configPath' -Encoding UTF8
Import-Module BurntToast -ErrorAction SilentlyContinue
New-BurntToastNotification -Text 'CrestronAISkills', "Skill '`$(`$c.name)' updated to v`$(`$l.version)" -ErrorAction SilentlyContinue
"@ | Set-Content $updateScriptPath -Encoding UTF8

# 6. Install BurntToast if missing (Windows toast notifications)
if (-not (Get-Module -ListAvailable BurntToast)) {
    Write-Host "  Installing BurntToast for notifications..."
    Install-Module BurntToast -Scope CurrentUser -Force
}

# 7. Register Task Scheduler (no admin needed)
$action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Normal -NonInteractive -File `"$updateScriptPath`""
$trigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "9:00AM"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "CrestronSkill-$skillName" -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force | Out-Null
Write-Host "  Task Scheduler: CrestronSkill-$skillName (weekly Monday 9am)"

Write-Host "`n✅ Done!" -ForegroundColor Green
Write-Host "   GitHub Copilot: $copilotDest"
Write-Host "   Claude Code:    $claudeDest  (use as /$skillName)"
Write-Host "   Metadata:       $configDir\ and $claudeConfigDir\"
Write-Host "   Auto-updates scheduled every Monday at 9am.`n" -ForegroundColor DarkGray
