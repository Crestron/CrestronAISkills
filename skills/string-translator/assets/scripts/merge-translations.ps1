<#
.SYNOPSIS
    Merges baseline locale files with Copilot-translated locale files into a final output.

.DESCRIPTION
    For each locale:
      - Takes all content ABOVE the marker line from the baseline file (copied verbatim)
      - Takes the full string body from the to-translate file (new translations)
      - Writes merged result to the output folder

    The marker line itself is dropped from all output files.
    Run this script from your project root.

.PARAMETER SourceBase
    Folder containing the baseline locale files (values/, values-{locale}/).

.PARAMETER TranslateBase
    Folder containing the Copilot-translated locale files (values/, values-{locale}/).

.PARAMETER OutputBase
    Folder where merged output will be written.

.PARAMETER Marker
    Exact marker comment text that divides verbatim strings (above) from translated strings (below).

.EXAMPLE
    .\merge-translations.ps1 `
      -SourceBase "data/inputs/my-app/baseline" `
      -TranslateBase "data/inputs/my-app/to-translate" `
      -OutputBase "data/inputs/my-app/output" `
      -Marker "Need translations for everything below this line"
#>

param(
    [Parameter(Mandatory)][string]$SourceBase,
    [Parameter(Mandatory)][string]$TranslateBase,
    [Parameter(Mandatory)][string]$OutputBase,
    [Parameter(Mandatory)][string]$Marker
)

# Resolve to absolute paths relative to the current working directory
if (-not [System.IO.Path]::IsPathRooted($SourceBase))    { $SourceBase    = Join-Path $PWD $SourceBase }
if (-not [System.IO.Path]::IsPathRooted($TranslateBase)) { $TranslateBase = Join-Path $PWD $TranslateBase }
if (-not [System.IO.Path]::IsPathRooted($OutputBase))    { $OutputBase    = Join-Path $PWD $OutputBase }

$markerComment = "<!-- $Marker -->"

Write-Host "Source base   : $SourceBase"
Write-Host "Translate base: $TranslateBase"
Write-Host "Output base   : $OutputBase"
Write-Host "Marker        : $markerComment"
Write-Host ""

$localeFolders = @("values") + (Get-ChildItem -Path $SourceBase -Directory | Select-Object -ExpandProperty Name)

$created = 0
$skipped = 0

foreach ($folder in $localeFolders) {
    $srcFile = Join-Path $SourceBase    "$folder\strings.xml"
    $trnFile = Join-Path $TranslateBase "$folder\strings.xml"
    $outDir  = Join-Path $OutputBase    $folder
    $outFile = Join-Path $outDir        "strings.xml"

    if (-not (Test-Path $srcFile)) {
        Write-Warning "SKIP — no baseline file: $folder\strings.xml"
        $skipped++; continue
    }
    if (-not (Test-Path $trnFile)) {
        Write-Warning "SKIP — no translate file: $folder\strings.xml"
        $skipped++; continue
    }

    $srcLines = Get-Content $srcFile -Encoding UTF8
    $trnLines = Get-Content $trnFile -Encoding UTF8

    # Find marker line in baseline
    $markerIdx = -1
    for ($i = 0; $i -lt $srcLines.Count; $i++) {
        if ($srcLines[$i] -match [regex]::Escape($markerComment)) {
            $markerIdx = $i
            break
        }
    }
    if ($markerIdx -lt 0) {
        Write-Warning "SKIP — marker not found in: $folder\strings.xml"
        $skipped++; continue
    }

    # Take content above the marker, strip trailing blank lines and </resources>
    $above = $srcLines[0..($markerIdx - 1)]
    while ($above.Count -gt 0 -and ($above[-1].Trim() -eq "" -or $above[-1].Trim() -eq "</resources>")) {
        $above = $above[0..($above.Count - 2)]
    }

    # Extract body lines from the to-translate file (between <resources> and </resources>)
    $trnStart = -1
    $trnEnd   = -1
    for ($i = 0; $i -lt $trnLines.Count; $i++) {
        if ($trnLines[$i] -match "^\s*<resources>")  { $trnStart = $i + 1 }
        if ($trnLines[$i] -match "^\s*</resources>") { $trnEnd   = $i - 1; break }
    }
    if ($trnStart -lt 0 -or $trnEnd -lt 0) {
        Write-Warning "SKIP — bad format in translate file: $folder\strings.xml"
        $skipped++; continue
    }

    $trnBody = $trnLines[$trnStart..$trnEnd]

    # Write merged output (UTF-8 without BOM)
    $merged = $above + $trnBody + @("</resources>")
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    [System.IO.File]::WriteAllLines($outFile, $merged, [System.Text.UTF8Encoding]::new($false))

    Write-Host "OK: $folder  ($($above.Count + $trnBody.Count + 1) lines)"
    $created++
}

Write-Host ""
Write-Host "Finished. Created: $created  |  Skipped: $skipped"
