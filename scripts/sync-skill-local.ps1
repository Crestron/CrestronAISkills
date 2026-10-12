<#
.SYNOPSIS
  Sync a skill from a team's repo into CrestronAISkills from your own machine and open (or update) the sync PR.

.DESCRIPTION
  Local equivalent of .github/workflows/sync-skill.yml. Use it when the workflow can't reach the
  source repo — e.g. the CrestronEng org's IP allow list blocks GitHub-hosted runners. Run it from an
  allow-listed network (office or VPN).

  It runs the same .github/scripts/sync-skill.js as the workflow, in a temporary folder (your working
  copy is never touched), then pushes sync/<name> and opens the PR. A PR pushed by you triggers the
  full CI (Validate Skill, Test Skill, Test Tooling). If sync/<name> already has an open PR, it updates
  that PR instead of opening a new one.

.PARAMETER SourceRepo   Team repo as owner/repo, e.g. CrestronEng/CrestronAutoSDLC
.PARAMETER SourcePath   Path to the skill folder inside that repo, e.g. dotgithub-contents/skills/design-review
.PARAMETER SourceRef    Full 40-character commit SHA to sync. Default: the current tip of the repo's default branch.
.PARAMETER Name         Skill name here (skills/<name>/). Default: last segment of SourcePath.
.PARAMETER DryRun       Do everything except push and open the PR; keeps the work folder for inspection.

.EXAMPLE
  ./scripts/sync-skill-local.ps1 -SourceRepo CrestronEng/CrestronAutoSDLC -SourcePath dotgithub-contents/skills/design-review
#>
param(
    [Parameter(Mandatory = $true)][string]$SourceRepo,
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [string]$SourceRef,
    [string]$Name,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$TargetRepo = "Crestron/CrestronAISkills"

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$argv) {
    & $exe @argv
    if ($LASTEXITCODE -ne 0) { Fail "$exe $($argv -join ' ') failed (exit $LASTEXITCODE)" }
}

Step "Checking prerequisites"
foreach ($tool in "git", "node", "npm", "gh") {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "'$tool' is not installed or not on PATH." }
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI is not signed in. Run: gh auth login" }

if ($SourceRepo -notmatch '^[^/\s]+/[^/\s]+$') { Fail "SourceRepo must be owner/repo, got '$SourceRepo'." }
if (-not $Name) { $Name = ($SourcePath.TrimEnd('/') -split '/')[-1] }
if ($Name -notmatch '^[a-z][a-z0-9]*(-[a-z0-9]+)*$') { Fail "Skill name '$Name' must be lowercase letters/digits with hyphens." }
$Branch = "sync/$Name"

if (-not $SourceRef) {
    Step "Looking up the latest commit on $SourceRepo"
    $SourceRef = gh api "repos/$SourceRepo/commits/HEAD" --jq .sha
    if ($LASTEXITCODE -ne 0 -or -not $SourceRef) {
        Fail "Can't read $SourceRepo. Check you have access, and that you're on VPN if the org has an IP allow list."
    }
}
if ($SourceRef -notmatch '^[0-9a-f]{40}$') { Fail "SourceRef must be a full 40-character commit SHA, got '$SourceRef'." }
Write-Host "Source: $SourceRepo@$SourceRef : $SourcePath -> skills/$Name/"

$Work = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-sync-$Name-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $Work | Out-Null
$SkillsRepo = Join-Path $Work "skills-repo"
$Source = Join-Path $Work "source"

try {
    Step "Cloning $TargetRepo (main)"
    Run git @("clone", "--quiet", "--depth", "1", "--branch", "main", "https://github.com/$TargetRepo.git", $SkillsRepo)
    Run git @("-C", $SkillsRepo, "switch", "--quiet", "-C", $Branch)

    Step "Fetching $SourceRepo at $SourceRef"
    Run git @("init", "--quiet", $Source)
    Run git @("-C", $Source, "fetch", "--quiet", "--depth", "1", "https://github.com/$SourceRepo.git", $SourceRef)
    Run git @("-C", $Source, "checkout", "--quiet", "FETCH_HEAD")

    Step "Running the sync script"
    Push-Location $SkillsRepo
    try {
        Run npm @("ci", "--ignore-scripts", "--no-fund", "--no-audit", "--loglevel=error")
        $env:SOURCE_DIR = $Source; $env:SOURCE_PATH = $SourcePath; $env:TARGET_NAME = $Name
        $env:SOURCE_REPO = $SourceRepo; $env:SOURCE_REF = $SourceRef
        Run node @(".github/scripts/sync-skill.js")

        Run git @("add", "skills/$Name", "copilot-skills/$Name")
        git diff --staged --quiet
        if ($LASTEXITCODE -eq 0) { Write-Host "`nNo changes: skills/$Name already matches $SourceRepo@$SourceRef." -ForegroundColor Yellow; exit 0 }
        Run git @("commit", "--quiet", "-m", "sync: update $Name from $SourceRepo@$SourceRef")

        if ($DryRun) {
            Write-Host "`nDry run: committed locally, not pushed. Inspect: $SkillsRepo" -ForegroundColor Yellow
            git --no-pager show --stat HEAD
            $Work = $null   # keep the folder
            exit 0
        }

        $existing = gh pr list --repo $TargetRepo --head $Branch --base main --state open --json url --jq ".[0].url"
        Step "Pushing $Branch"
        Run git @("push", "--quiet", "--force", "origin", $Branch)

        if ($existing) {
            Write-Host "`nUpdated existing PR: $existing" -ForegroundColor Green
        } else {
            $body = "Mirrors ``$Name`` from [``$SourceRepo``](https://github.com/$SourceRepo)@``$SourceRef``.`n`n" +
                    "If this is a new skill, ``validate-skill.yml`` will list the Crestron-only compliance metadata " +
                    "(scope, test-strategy, approved-by, etc.) that still needs filling in before this can merge -- this is expected, not a bug.`n`n" +
                    "_Synced from a local machine with ``scripts/sync-skill-local.ps1`` (the source repo isn't reachable from GitHub-hosted runners)._"
            Step "Opening PR"
            $url = gh pr create --repo $TargetRepo --base main --head $Branch --title "sync: import $Name from $SourceRepo" --body $body
            if ($LASTEXITCODE -ne 0) { Fail "gh pr create failed." }
            Write-Host "`nOpened PR: $url" -ForegroundColor Green
        }
        Write-Host "Validate Skill, Test Skill and Test Tooling start on the PR within a minute."
    } finally { Pop-Location }
} finally {
    if ($Work -and (Test-Path $Work)) { Remove-Item -Recurse -Force $Work -ErrorAction SilentlyContinue }
}
