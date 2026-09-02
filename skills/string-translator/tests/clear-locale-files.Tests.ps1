#Requires -Module Pester
<#
.SYNOPSIS
    Pester tests for clear-locale-files.ps1 — happy path, boundary, idempotency,
    and injection/path-traversal cases (C3 checklist requirement).
#>

BeforeAll {
    $script:ScriptPath = Join-Path $PSScriptRoot "..\assets\scripts\clear-locale-files.ps1"
}

Describe "clear-locale-files.ps1" {

    BeforeEach {
        $script:TestRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid())
        New-Item -ItemType Directory -Path $script:TestRoot -Force | Out-Null

        New-Item -ItemType Directory -Path (Join-Path $script:TestRoot "values") -Force | Out-Null
        Set-Content (Join-Path $script:TestRoot "values\strings.xml") "<resources></resources>"

        foreach ($locale in @("de", "fr")) {
            $dir = Join-Path $script:TestRoot "values-$locale"
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Set-Content (Join-Path $dir "strings.xml") "<resources></resources>"
        }
    }

    AfterEach {
        Remove-Item -Path $script:TestRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Context "Happy path" {
        It "removes strings.xml for each requested locale" {
            & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "de,fr"
            Test-Path (Join-Path $script:TestRoot "values-de\strings.xml") | Should -BeFalse
            Test-Path (Join-Path $script:TestRoot "values-fr\strings.xml") | Should -BeFalse
        }

        It "never deletes the protected source strings.xml" {
            & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "de,fr"
            Test-Path (Join-Path $script:TestRoot "values\strings.xml") | Should -BeTrue
        }
    }

    Context "Boundary: empty input" {
        It "does nothing and exits cleanly with an empty -Locales value" {
            { & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "" -LocalesFile (Join-Path $script:TestRoot "target_languages.txt") } | Should -Not -Throw
        }
    }

    Context "Default locales-file and relative-path resolution" {
        It "reads target_languages.txt from WorkingDir when -Locales is omitted" {
            Set-Content (Join-Path $script:TestRoot "target_languages.txt") @("de", "fr")
            & $script:ScriptPath -WorkingDir $script:TestRoot
            Test-Path (Join-Path $script:TestRoot "values-de\strings.xml") | Should -BeFalse
            Test-Path (Join-Path $script:TestRoot "values-fr\strings.xml") | Should -BeFalse
        }

        It "resolves a relative -WorkingDir against the current location" {
            Push-Location (Split-Path $script:TestRoot -Parent)
            try {
                & $script:ScriptPath -WorkingDir (Split-Path $script:TestRoot -Leaf) -Locales "de"
            } finally {
                Pop-Location
            }
            Test-Path (Join-Path $script:TestRoot "values-de\strings.xml") | Should -BeFalse
        }

        It "resolves a relative -LocalesFile against the current location" {
            Set-Content (Join-Path $script:TestRoot "custom-locales.txt") @("fr")
            Push-Location $script:TestRoot
            try {
                & $script:ScriptPath -WorkingDir $script:TestRoot -LocalesFile "custom-locales.txt"
            } finally {
                Pop-Location
            }
            Test-Path (Join-Path $script:TestRoot "values-fr\strings.xml") | Should -BeFalse
        }
    }

    Context "Boundary: nonexistent WorkingDir" {
        It "errors instead of silently proceeding against an unresolved path" {
            $missing = Join-Path $script:TestRoot "does-not-exist"
            & $script:ScriptPath -WorkingDir $missing -Locales "de" 2>$null
            $LASTEXITCODE | Should -Be 1
        }
    }

    Context "Idempotency" {
        It "produces the same end state when invoked twice in a row" {
            & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "de,fr"
            { & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "de,fr" } | Should -Not -Throw
            Test-Path (Join-Path $script:TestRoot "values-de\strings.xml") | Should -BeFalse
        }
    }

    Context "Injection / path traversal" {
        It "rejects a locale code containing path-traversal segments instead of deleting outside WorkingDir" {
            $canary = Join-Path ([System.IO.Path]::GetTempPath()) "clear-locale-canary-$([System.Guid]::NewGuid()).xml"
            Set-Content $canary "do-not-delete"

            & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "..\..\..\$([System.IO.Path]::GetFileNameWithoutExtension($canary))" 2>$null

            $LASTEXITCODE | Should -Be 1
            Test-Path $canary | Should -BeTrue
            Remove-Item $canary -Force -ErrorAction SilentlyContinue
        }

        It "rejects a locale code containing a raw path separator" {
            & $script:ScriptPath -WorkingDir $script:TestRoot -Locales "de/../../etc" 2>$null
            $LASTEXITCODE | Should -Be 1
        }
    }
}
