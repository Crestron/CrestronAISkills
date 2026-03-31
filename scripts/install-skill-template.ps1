# CrestronAISkills - Skill Installer (Windows)
# Requires: Windows PowerShell 5.1+ (built-in on Windows 10/11)
# Placeholders replaced at download time: __SKILL_NAME__, __SKILL_VERSION__, __REGISTRY_URL__, __PAGES_URL__

$skillName    = "__SKILL_NAME__"
$skillVersion = "__SKILL_VERSION__"
$registryUrl  = "__REGISTRY_URL__"
$pagesUrl     = "__PAGES_URL__"

Write-Host "`nCrestronAISkills — Installing: $skillName v$skillVersion" -ForegroundColor Cyan
Write-Host ("─" * 50)

# Config dir
$configDir = Join-Path $env:USERPROFILE ".copilot\skills"
if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Force -Path $configDir | Out-Null }

# 1. Get or reuse stored GitHub PAT
$tokenFile = Join-Path $configDir "github-token"
if (Test-Path $tokenFile) {
    $ghToken = (Get-Content $tokenFile -Raw).Trim()
    Write-Host "  Using stored GitHub token."
} else {
    Write-Host ""
    Write-Host "  A GitHub Personal Access Token (PAT) with 'read:org' scope is required" -ForegroundColor Yellow
    Write-Host "  for auto-updates (private Pages site). You only need to enter this once." -ForegroundColor Yellow
    $ghToken = Read-Host "`n  Enter your GitHub PAT"
    if ([string]::IsNullOrWhiteSpace($ghToken)) { Write-Host "ERROR: PAT required." -ForegroundColor Red; exit 1 }
    Set-Content $tokenFile $ghToken.Trim() -Encoding UTF8 -NoNewline
    Write-Host "  Token saved."
}
$headers = @{ Authorization = "token $ghToken" }

# 2. Ask for project path
$defaultPath = (Get-Location).Path
$inputPath = Read-Host "`nEnter your project root path (press Enter for: $defaultPath)"
if ([string]::IsNullOrWhiteSpace($inputPath)) { $inputPath = $defaultPath }
if (-not (Test-Path $inputPath)) { Write-Host "ERROR: Path not found." -ForegroundColor Red; exit 1 }
$projectPath = (Resolve-Path $inputPath).Path

# 3. Install all skill files to .github\skills\<name>\
$skillsFolder = Join-Path $projectPath ".github\skills\$skillName"
New-Item -ItemType Directory -Force -Path $skillsFolder | Out-Null
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem $scriptDir -Recurse -File | Where-Object { $_.Name -notin @('install.ps1', 'install.sh') } | ForEach-Object {
    $relPath = $_.FullName.Substring($scriptDir.Length + 1)
    $dest = Join-Path $skillsFolder $relPath
    $destParent = Split-Path -Parent $dest
    if (-not (Test-Path $destParent)) { New-Item -ItemType Directory -Force -Path $destParent | Out-Null }
    Copy-Item $_.FullName $dest -Force
}
$destMd = Join-Path $skillsFolder "skill.md"
Write-Host "  Installed to $skillsFolder"

# 4. Save config
$configPath = Join-Path $configDir "$skillName-config.json"
[ordered]@{ name=$skillName; version=$skillVersion; projectPath=$projectPath; registryUrl=$registryUrl; pagesUrl=$pagesUrl; installedAt=(Get-Date -Format 'o') } | ConvertTo-Json | Set-Content $configPath -Encoding UTF8

# 4b. Download check-updates scripts to config dir (so skill's reminder works)
try {
    Invoke-WebRequest "$pagesUrl/scripts/check-updates.ps1" -OutFile (Join-Path $configDir "check-updates.ps1") -Headers $headers -UseBasicParsing
    Write-Host "  check-updates.ps1 saved to $configDir"
} catch { Write-Host "  Warning: could not download check-updates.ps1" -ForegroundColor Yellow }
try {
    Invoke-WebRequest "$pagesUrl/scripts/check-updates.sh" -OutFile (Join-Path $configDir "check-updates.sh") -Headers $headers -UseBasicParsing
    Write-Host "  check-updates.sh saved to $configDir"
} catch { Write-Host "  Warning: could not download check-updates.sh" -ForegroundColor Yellow }

# 5. Write update script
$updateScriptPath = Join-Path $configDir "update-$skillName.ps1"
@"
`$c = Get-Content '$configPath' | ConvertFrom-Json
`$t = if (Test-Path '$tokenFile') { (Get-Content '$tokenFile' -Raw).Trim() } else { '' }
`$h = if (`$t) { @{ Authorization = "token `$t" } } else { @{} }
try { `$r = Invoke-RestMethod `$c.registryUrl -Headers `$h } catch { exit 1 }
`$l = `$r.skills | Where-Object { `$_.name -eq `$c.name } | Select-Object -First 1
if (-not `$l -or `$l.version -eq `$c.version) { exit 0 }
`$filesJson = Invoke-RestMethod "`$(`$c.pagesUrl)/skills/`$(`$c.name)/files.json" -Headers `$h
foreach (`$f in `$filesJson) {
    `$dest = Join-Path '$skillsFolder' `$f
    `$destDir = Split-Path -Parent `$dest
    if (-not (Test-Path `$destDir)) { New-Item -ItemType Directory -Force -Path `$destDir | Out-Null }
    Invoke-WebRequest "`$(`$c.pagesUrl)/skills/`$(`$c.name)/`$f" -OutFile `$dest -Headers `$h -UseBasicParsing
}
`$c.version = `$l.version; `$c | ConvertTo-Json | Set-Content '$configPath' -Encoding UTF8
Import-Module BurntToast -ErrorAction SilentlyContinue
New-BurntToastNotification -Text 'CrestronAISkills', "Skill '`$(`$c.name)' updated to v`$(`$l.version)" -ErrorAction SilentlyContinue
"@ | Set-Content $updateScriptPath -Encoding UTF8

# 6. Install BurntToast if missing
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

Write-Host "`n✅ Done! Installed to: $destMd" -ForegroundColor Green
Write-Host "   Auto-updates scheduled every Monday at 9am.`n" -ForegroundColor DarkGray

