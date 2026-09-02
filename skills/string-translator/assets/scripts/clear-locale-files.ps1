<#
.SYNOPSIS
    Deletes strings.xml from all locale output folders in the to-translate working area.

.DESCRIPTION
    Reads locale codes from a target_languages.txt file (one per line) and removes
    values-{locale}/strings.xml files so Copilot can write fresh translations.
    Run this script from your to-translate folder.

.PARAMETER WorkingDir
    Folder containing the values-{locale}/ subfolders to clear.
    Defaults to the current directory.

.PARAMETER LocalesFile
    Path to the locale list file. Defaults to target_languages.txt in the WorkingDir.

.PARAMETER Locales
    Comma-separated list of specific locales to clear (e.g. "ar,de,fr").
    When omitted, all locales in the file are cleared.

.EXAMPLE
    # Clear all locales (run from the to-translate folder)
    .\clear-locale-files.ps1

.EXAMPLE
    # Clear only Arabic and German
    .\clear-locale-files.ps1 -Locales "ar,de"

.EXAMPLE
    # Run from project root, targeting a specific folder
    .\clear-locale-files.ps1 -WorkingDir "data/inputs/my-app/to-translate"
#>

param (
    [string]$WorkingDir  = $PWD,
    [string]$LocalesFile = "",
    [string]$Locales     = ""
)

if (-not [System.IO.Path]::IsPathRooted($WorkingDir)) {
    $WorkingDir = Join-Path $PWD $WorkingDir
}

# Security: resolve WorkingDir to a real, existing directory before anything else
# is computed relative to it. Without this, a non-existent path would still let
# path arithmetic below proceed against an unresolved (and unverifiable) root.
$resolvedWorkingDir = Resolve-Path -LiteralPath $WorkingDir -ErrorAction SilentlyContinue
if (-not $resolvedWorkingDir) {
    Write-Error "WorkingDir not found: $WorkingDir"
    exit 1
}
$WorkingDir = $resolvedWorkingDir.Path

# Resolve locales list
if ($Locales -ne "") {
    $localeList = $Locales -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
} else {
    if ($LocalesFile -eq "") { $LocalesFile = Join-Path $WorkingDir "target_languages.txt" }
    if (-not [System.IO.Path]::IsPathRooted($LocalesFile)) {
        $LocalesFile = Join-Path $PWD $LocalesFile
    }
    if (-not (Test-Path $LocalesFile)) {
        Write-Error "Locales file not found: $LocalesFile`nProvide -LocalesFile or -Locales."
        exit 1
    }
    $localeList = Get-Content $LocalesFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

# Security: a locale code is a bare identifier, never a path. Reject anything that
# could turn "values-$locale" into a traversal segment (e.g. "..\..\Windows") before
# it's ever joined into a filesystem path.
$invalidLocales = $localeList | Where-Object { $_ -notmatch '^[A-Za-z0-9_-]+$' }
if ($invalidLocales) {
    Write-Error "Invalid locale code(s), must be letters/numbers/hyphens/underscores only: $($invalidLocales -join ', ')"
    exit 1
}

$sourceFile = (Join-Path $WorkingDir "values\strings.xml") | Resolve-Path -ErrorAction SilentlyContinue

$removed = 0
$skipped = 0

foreach ($locale in $localeList) {
    $target = Join-Path $WorkingDir "values-$locale\strings.xml"

    # Safety guard: never delete the source strings.xml
    $resolvedTarget = Resolve-Path $target -ErrorAction SilentlyContinue
    if ($sourceFile -and $resolvedTarget -and ($resolvedTarget.Path -eq $sourceFile.Path)) {
        Write-Warning "Skipped  values-$locale\strings.xml  (matches source file — protected)"
        $skipped++; continue
    }

    # Defense in depth: even with the locale-code allowlist above, verify the
    # resolved target never escapes WorkingDir before deleting anything.
    if ($resolvedTarget -and -not $resolvedTarget.Path.StartsWith($WorkingDir + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        Write-Warning "Skipped  values-$locale\strings.xml  (resolves outside WorkingDir — refusing to delete)"
        $skipped++; continue
    }

    if (Test-Path $target) {
        Remove-Item $target -Force
        Write-Host "Removed  values-$locale\strings.xml"
        $removed++
    } else {
        Write-Host "Skipped  values-$locale\strings.xml  (not found)"
        $skipped++
    }
}

Write-Host ""
Write-Host "Done. Removed: $removed  |  Skipped (not found): $skipped"
