# Local deploy script for Windows PowerShell
# Run this after merging a skill PR to rebuild the registry and redeploy the site.
# Requirements: Node.js 18+, git

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/CrestronEng/CrestronAISkills"
$RegistryUrl = "https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/registry.json"
$BaseDir = Split-Path -Parent $PSScriptRoot

Set-Location $BaseDir

Write-Host "`n=== Step 1: Pull latest changes from main ===" -ForegroundColor Cyan
git pull origin main

Write-Host "`n=== Step 2: Rebuild registry.json ===" -ForegroundColor Cyan
node -e @"
const fs = require('fs');
const path = require('path');
const skillsDir = 'skills';
const skills = [];
if (fs.existsSync(skillsDir)) {
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mp = path.join(skillsDir, entry.name, 'skill.json');
    if (!fs.existsSync(mp)) continue;
    const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
    skills.push({ name: m.name, version: m.version, description: m.description, tags: m.tags, author: m.author, path: skillsDir+'/'+entry.name, entry: m.entry||'extension.mjs', license: m.license||'MIT', homepage: m.homepage||null });
    console.log('  +', m.name + '@' + m.version);
  }
}
const registry = { version: '1', updatedAt: new Date().toISOString(), skills: skills.sort((a,b) => a.name.localeCompare(b.name)) };
fs.writeFileSync('registry.json', JSON.stringify(registry, null, 2) + '\n');
console.log('Registry updated:', skills.length, 'skill(s)');
"@

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

