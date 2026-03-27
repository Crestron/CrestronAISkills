# Local deploy script for Windows PowerShell
# Run this after merging a skill PR to rebuild the registry and redeploy the site.
# Requirements: Node.js 18+, git

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/CrestronEng/CrestronAISkills"
$RegistryUrl = "/registry.json"
$BaseDir = Split-Path -Parent $PSScriptRoot

Set-Location $BaseDir

Write-Host "`n=== Step 1: Pull latest changes from main ===" -ForegroundColor Cyan
git pull origin main

Write-Host "`n=== Step 2: Rebuild registry.json ===" -ForegroundColor Cyan
$skillsDir = "skills"
$skills = @()
if (Test-Path $skillsDir) {
    foreach ($entry in Get-ChildItem $skillsDir -Directory) {
        # Accept skill.md or SKILL.md (case-insensitive)
        $skillMd = Get-ChildItem (Join-Path $skillsDir $entry.Name) -Filter "skill.md" -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $skillMd) { continue }
        $skillMdPath = $skillMd.FullName
        # Parse YAML frontmatter between the first two --- markers
        $lines = Get-Content $skillMdPath
        $fm = @{}
        $inFm = $false
        foreach ($line in $lines) {
            if ($line -eq '---' -and -not $inFm) { $inFm = $true; continue }
            if ($line -eq '---' -and $inFm) { break }
            if ($inFm) {
                if ($line -match '^(\w+):\s*(.*)$') {
                    $key = $Matches[1]
                    $val = $Matches[2].Trim()
                    if ($val -match '^\[(.+)\]$') {
                        $fm[$key] = ($Matches[1] -split ',') | ForEach-Object { $_.Trim().Trim('"').Trim("'") }
                    } else {
                        $fm[$key] = $val.Trim('"').Trim("'")
                    }
                }
            }
        }
        $skillEntry = [ordered]@{
            name        = $fm['name']
            version     = $fm['version']
            description = $fm['description']
            tags        = @($fm['tags'])
            author      = $fm['author']
            path        = "$skillsDir/$($entry.Name)"
            license     = if ($fm['license']) { $fm['license'] } else { 'MIT' }
            homepage    = if ($fm['homepage']) { $fm['homepage'] } else { $null }
        }
        $skills += $skillEntry
        Write-Host "  + $($fm['name'])@$($fm['version'])"
    }
}
$skills = $skills | Sort-Object { $_['name'] }
$registry = [ordered]@{
    version   = "1"
    updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    skills    = $skills
}
$registry | ConvertTo-Json -Depth 10 | Set-Content "registry.json" -Encoding UTF8
Write-Host "Registry updated: $($skills.Count) skill(s)"

Write-Host "`n=== Step 3: Commit registry.json back to main ===" -ForegroundColor Cyan
git add registry.json
$staged = git diff --cached --name-only
if ($staged) {
    git commit -m "chore: update registry.json [skip ci]"
    git push origin main
    Write-Host "  registry.json committed and pushed to main" -ForegroundColor Green
} else {
    Write-Host "  No registry changes to commit." -ForegroundColor Yellow
}

Write-Host "`n=== Step 4: Build web app ===" -ForegroundColor Cyan
Set-Location "$BaseDir\web"
$env:VITE_REGISTRY_URL = $RegistryUrl
$env:VITE_REPO_URL = $RepoUrl
$env:VITE_BASE_PATH = "/"
npm run build
Copy-Item "..\registry.json" "dist\registry.json" -Force

# Copy each skill.md into dist so Pages serves them without auth
$skillsSrc = "$BaseDir\skills"
if (Test-Path $skillsSrc) {
    foreach ($entry in Get-ChildItem $skillsSrc -Directory) {
        $src = Get-ChildItem (Join-Path $skillsSrc $entry.Name) -Filter "skill.md" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($src) {
            $destDir = "dist\skills\$($entry.Name)"
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            Copy-Item $src.FullName "$destDir\skill.md" -Force
            Write-Host "  Copied skill: $($entry.Name)"
        }
    }
}

# Copy update scripts to dist so they're downloadable from Pages
if (Test-Path "$BaseDir\scripts\check-updates.ps1") {
    Copy-Item "$BaseDir\scripts\check-updates.ps1" "dist\check-updates.ps1" -Force
    Write-Host "  Copied check-updates.ps1"
}
if (Test-Path "$BaseDir\scripts\install-skill-template.ps1") {
    Copy-Item "$BaseDir\scripts\install-skill-template.ps1" "dist\install-skill-template.ps1" -Force
    Write-Host "  Copied install-skill-template.ps1"
}
if (Test-Path "$BaseDir\scripts\install-skill-template.sh") {
    Copy-Item "$BaseDir\scripts\install-skill-template.sh" "dist\install-skill-template.sh" -Force
    Write-Host "  Copied install-skill-template.sh"
}

Set-Location $BaseDir

Write-Host "`n=== Step 5: Deploy to gh-pages branch ===" -ForegroundColor Cyan
$deployDir = "$env:TEMP\gh-pages-deploy-$(Get-Random)"
$branch = "gh-pages"

git fetch origin

$branchExists = git show-ref --quiet "refs/remotes/origin/$branch" 2>$null
if ($LASTEXITCODE -eq 0) {
    git worktree add $deployDir -B $branch "origin/$branch"
} else {
    git worktree add --orphan -b $branch $deployDir
}

Copy-Item "$BaseDir\web\dist\*" $deployDir -Recurse -Force
New-Item -ItemType File -Path "$deployDir\.nojekyll" -Force | Out-Null

Set-Location $deployDir
git add -A
$changes = git diff --cached --name-only
if ($changes) {
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    git commit -m "deploy: update GitHub Pages [$timestamp]"
    git push origin $branch
    Write-Host "`n✅ Deployed! Site: https://CrestronEng.github.io/CrestronAISkills" -ForegroundColor Green
} else {
    Write-Host "`nNo changes to deploy." -ForegroundColor Yellow
}

Set-Location $BaseDir
git worktree remove $deployDir --force

