#Requires -Module Pester
<#
.SYNOPSIS
    Pester tests for merge-translations.ps1 — happy path, boundary, and
    injection cases (C3 checklist requirement).
#>

BeforeAll {
    $script:ScriptPath = Join-Path $PSScriptRoot "..\assets\scripts\merge-translations.ps1"

    function New-LocaleFile($baseDir, $folder, [string[]]$lines) {
        $dir = Join-Path $baseDir $folder
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Set-Content -Path (Join-Path $dir "strings.xml") -Value $lines -Encoding UTF8
    }
}

Describe "merge-translations.ps1" {

    BeforeEach {
        $script:TestRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid())
        $script:SourceBase    = Join-Path $script:TestRoot "baseline"
        $script:TranslateBase = Join-Path $script:TestRoot "to-translate"
        $script:OutputBase    = Join-Path $script:TestRoot "output"
        New-Item -ItemType Directory -Path $script:SourceBase, $script:TranslateBase, $script:OutputBase -Force | Out-Null
    }

    AfterEach {
        Remove-Item -Path $script:TestRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Context "Happy path" {
        It "keeps baseline content above the marker and translated content below it" {
            New-LocaleFile $script:SourceBase "values-de" @(
                "<resources>",
                "<string name=`"kept`">Kept</string>",
                "<!-- Need translations for everything below this line -->",
                "<string name=`"old`">Old</string>",
                "</resources>"
            )
            New-LocaleFile $script:TranslateBase "values-de" @(
                "<resources>",
                "<string name=`"new`">Neu</string>",
                "</resources>"
            )

            & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "Need translations for everything below this line"

            $merged = Get-Content (Join-Path $script:OutputBase "values-de\strings.xml") -Raw
            $merged | Should -Match 'name="kept">Kept'
            $merged | Should -Match 'name="new">Neu'
            $merged | Should -Not -Match 'name="old"'
        }
    }

    Context "Boundary: missing files" {
        It "skips a locale missing its translate file instead of throwing" {
            New-LocaleFile $script:SourceBase "values-fr" @(
                "<resources>", "<!-- Need translations for everything below this line -->", "</resources>"
            )
            { & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "Need translations for everything below this line" } | Should -Not -Throw
            Test-Path (Join-Path $script:OutputBase "values-fr\strings.xml") | Should -BeFalse
        }

        It "errors instead of crashing on a nonexistent SourceBase" {
            $missing = Join-Path $script:TestRoot "does-not-exist"
            & $script:ScriptPath -SourceBase $missing -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "x" 2>$null
            $LASTEXITCODE | Should -Be 1
        }

        It "errors instead of crashing on a nonexistent TranslateBase" {
            $missing = Join-Path $script:TestRoot "also-does-not-exist"
            & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $missing `
                -OutputBase $script:OutputBase -Marker "x" 2>$null
            $LASTEXITCODE | Should -Be 1
        }

        It "skips a locale whose baseline file has no marker line" {
            New-LocaleFile $script:SourceBase "values-it" @("<resources>", "<string name=`"a`">A</string>", "</resources>")
            New-LocaleFile $script:TranslateBase "values-it" @("<resources>", "<string name=`"b`">B</string>", "</resources>")
            & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "Need translations for everything below this line" *>$null
            Test-Path (Join-Path $script:OutputBase "values-it\strings.xml") | Should -BeFalse
        }

        It "skips a locale whose translate file has no <resources> body" {
            New-LocaleFile $script:SourceBase "values-pt" @("<resources>", "<!-- Need translations for everything below this line -->", "</resources>")
            New-LocaleFile $script:TranslateBase "values-pt" @("not-a-resources-file")
            & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "Need translations for everything below this line" *>$null
            Test-Path (Join-Path $script:OutputBase "values-pt\strings.xml") | Should -BeFalse
        }
    }

    Context "Boundary: trailing blank lines above the marker" {
        It "trims trailing blank lines before the marker from the baseline content" {
            New-LocaleFile $script:SourceBase "values-nl" @(
                "<resources>", "<string name=`"kept`">Kept</string>", "",
                "<!-- Need translations for everything below this line -->", "</resources>"
            )
            New-LocaleFile $script:TranslateBase "values-nl" @("<resources>", "<string name=`"new`">Nieuw</string>", "</resources>")

            & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker "Need translations for everything below this line" *>$null

            $merged = Get-Content (Join-Path $script:OutputBase "values-nl\strings.xml") -Raw
            $merged | Should -Match 'name="kept">Kept'
            $merged | Should -Match 'name="new">Nieuw'
        }
    }

    Context "Relative-path resolution" {
        It "resolves relative -SourceBase/-TranslateBase/-OutputBase against the current location" {
            New-LocaleFile $script:SourceBase "values-sv" @("<resources>", "<!-- Need translations for everything below this line -->", "</resources>")
            New-LocaleFile $script:TranslateBase "values-sv" @("<resources>", "<string name=`"new`">Ny</string>", "</resources>")

            Push-Location $script:TestRoot
            try {
                & $script:ScriptPath -SourceBase "baseline" -TranslateBase "to-translate" -OutputBase "output" `
                    -Marker "Need translations for everything below this line" *>$null
            } finally {
                Pop-Location
            }
            Test-Path (Join-Path $script:OutputBase "values-sv\strings.xml") | Should -BeTrue
        }
    }

    Context "Injection" {
        It "treats a regex-metacharacter-laden Marker as a literal string, not a pattern" {
            New-LocaleFile $script:SourceBase "values-es" @(
                "<resources>",
                "<string name=`"kept`">Kept</string>",
                "<!-- .*[marker](with)`$(specials) -->",
                "</resources>"
            )
            New-LocaleFile $script:TranslateBase "values-es" @(
                "<resources>",
                "<string name=`"new`">Nuevo</string>",
                "</resources>"
            )

            { & $script:ScriptPath -SourceBase $script:SourceBase -TranslateBase $script:TranslateBase `
                -OutputBase $script:OutputBase -Marker '.*[marker](with)$(specials)' } | Should -Not -Throw

            $merged = Get-Content (Join-Path $script:OutputBase "values-es\strings.xml") -Raw
            $merged | Should -Match 'name="kept">Kept'
            $merged | Should -Match 'name="new">Nuevo'
        }
    }
}
