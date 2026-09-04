---
name: string-translator
version: 1.2.2
description: Translates strings.xml files into multiple locales with marker-based incremental updates, brand-name exclusion, and QA back-translation.
tags: [localization, translation, strings]
author: CrestronEng
license: MIT
argument-hint: 'Optional: path to strings.xml or project name'
metadata:
  team: crestron-ai
  maintainer: sabtain.khan
  dependencies: "PowerShell 7+ (pwsh)"
  scope-allow: ["Read/write strings.xml files under the working directories passed as script parameters", "Run the bundled assets/scripts/*.ps1 scripts"]
  scope-deny: ["Any path outside the caller-supplied WorkingDir/SourceBase/TranslateBase/OutputBase", "Network or API calls"]
  input-schema: "merge-translations.ps1: -SourceBase, -TranslateBase, -OutputBase, -Marker (all string, all mandatory). clear-locale-files.ps1: -WorkingDir (string, default $PWD), -LocalesFile (string), -Locales (comma-separated locale codes matching ^[A-Za-z0-9_-]+$)."
  output-schema: "merge-translations.ps1 writes merged strings.xml files under -OutputBase. clear-locale-files.ps1 deletes values-<locale>/strings.xml files under -WorkingDir and prints a removed/skipped summary."
  output-max-size: "unbounded (bounded by input strings.xml size)"
  test-strategy: automated
  test-coverage: 95.9
  idempotent: true
  destructive-operations: ["clear-locale-files.ps1 deletes values-<locale>/strings.xml files via Remove-Item -Force"]
  approved-by: sabtain.khan
  approval-date: "2026-09-01"
  trigger-code: true
  trigger-tool: false
  trigger-fs: true
  trigger-ext: false
  trigger-fetch: false
  risk-tier: T2
  runtime-surfaces: ["Claude Code", "IDE extension"]
  permissions:
    file: "reads/writes strings.xml files under caller-supplied WorkingDir/SourceBase/TranslateBase/OutputBase"
    network: declined
    shell: "runs bundled PowerShell scripts (assets/scripts/*.ps1)"
    credential: declined
    memory: declined
    mcp: declined
    tool: declined
---

# String Translator

Translates `strings.xml` files into multiple locales using a structured workflow. Supports multiple source files in a single run, translates in the smallest possible batch, and reports the output path for each source file.

## Scope

**May do:** read/write `strings.xml` files under the working directories explicitly
passed as script parameters; run the bundled `assets/scripts/*.ps1` scripts.
**Must not do:** touch any path outside those caller-supplied directories, or make
any network/API call. `clear-locale-files.ps1` validates locale codes and resolved
target paths before deleting anything — see `tests/clear-locale-files.Tests.ps1`.

## When Not to Use This Skill

Not for translating anything other than `strings.xml`-style Android
resource files, and not for any task requiring network access or touching
files outside the caller-supplied working directories — this skill only
operates on local file paths explicitly passed as parameters.

## Precedence

This skill's instructions are subordinate to organizational and
system-level guardrails. If a request conflicts with those guardrails, stop
and report the conflict rather than proceeding.

---

## Distributing This Skill

The skill folder is the single source of truth — all scripts, config, and locale reference files are bundled inside it. To deploy into any project repo:

### Step 1 — Copy the skill
```
.github/skills/string-translator/   →  copy entire folder to target repo
```

### Step 2 — Copy assets to your project root

From the skill's `assets/` folder, copy these to your project root:

| Asset | Destination | Purpose |
|-------|-------------|----------|
| `assets/scripts/merge-translations.ps1` | `scripts/merge-translations.ps1` | Merge baseline + new translations |
| `assets/scripts/clear-locale-files.ps1` | `scripts/clear-locale-files.ps1` | Clear working area before a new run |
| `assets/translation_config.json` | `translation_config.json` | Pipeline config (update paths/rules for your project) |
| `assets/target_languages_crestron.txt` | `target_languages.txt` | Locale list (edit to match your project) |
| `assets/target_languages_crestron.csv` | `target_languages.csv` | Human-readable locale reference |

> **Using this template repo?** These files are already in place — no copying needed.

### Step 3 — Wire up Copilot (optional)

Add this to `.github/copilot-instructions.md` so Copilot triggers the skill automatically when users say "translate strings":
```
When the user asks to translate strings or localize a strings.xml file,
load and follow the string-translator skill.
```
Without this, users can still invoke the skill manually with `/string-translator` in Copilot Chat.

---

- **Mode A — From scratch**: Translate all strings in the file into target locales. The source `values/strings.xml` is used directly as the translation input.
- **Mode B — Incremental**: A marker comment in the source `strings.xml` divides the file. The skill automatically extracts strings below the marker into a `to-translate/values/strings.xml` working file, then translates from there. Strings above the marker are preserved in the existing baseline locale files and merged in after translation.

Strings tagged `translatable="false"` are **always omitted** from all locale output files regardless of mode or marker position. They are resolved at runtime from the base `values/` folder.

---

## Step 1: Gather Inputs

Use `ask_questions` to collect all inputs before doing any work. Batch related questions (max 4 per call).

### Batch 1 — Source and Marker

1. **Source path** — Full or workspace-relative path to a folder to scan for `strings.xml` files. All matching files found under this path (recursively) will be listed for the user to confirm before any work begins.
2. **Translation mode** — How to identify which strings to translate:
   - **Marker comment** — strings BELOW a specific comment are extracted and translated; strings above stay in the baseline locale files
   - **`translatable="false"` only** — strings with this attribute are excluded; all others are translated
   - **Both** — marker as primary boundary AND honour `translatable="false"` within the translatable zone
   - **Custom** — user describes their own selection criteria; ask a follow-up question to capture the exact rules before proceeding
3. **Marker text** — If using a marker, ask for the **exact text** of the comment (e.g. `Need translations for everything below this line`). Do NOT infer it from the file — always ask.

### Batch 2 — Target Locales and Output Location

1. **Locale source** — Read from a file (e.g. `target_languages.txt`, one code per line) or pasted directly? A default Crestron 31-locale list is available at [./assets/target_languages_crestron.txt](./assets/target_languages_crestron.txt).
2. **To-translate working folder** — Parent folder where the extracted `values/strings.xml` and translated `values-{locale}/strings.xml` files will be written (e.g. `data/inputs/my-app/to-translate`).

### Batch 3 — Exclusion Rules

1. **Exclusion list** — Read from a file (e.g. `translation_config.json`) or provided now? A template config is available at [./assets/translation_config.template.json](./assets/translation_config.template.json).
2. **Format confirmation** — Confirm the source file uses standard XML: `<string name="key">value</string>`, with `\'` for apostrophes and `\n` for line breaks.

---

## Step 1b: Discover Source Files

After receiving the source path, scan it recursively for all `strings.xml` files. Present the full list to the user:

```
Found N strings.xml file(s):
  1. path/to/values/strings.xml
  2. path/to/other/values/strings.xml
  ...
```

Ask the user to confirm which files to include (default: all). Do not proceed until selection is confirmed.

For each selected source file, derive its output path as:
```
{to-translate-folder}/{relative-source-path}/values-{locale}/strings.xml
```

---

## Step 2: Validate Source Files

For each selected source file, read it and verify:

- Valid XML with `<resources>` root
- Contains `<string name="...">` entries
- Marker comment exists in file (if marker mode selected)

Report per source file:
- File path
- Total string entries
- Count with `translatable="false"` (omitted from all locale files)
- Count above the marker (stays in baseline, not re-translated) — if marker mode
- Count below the marker (translation candidates) — if marker mode
- Final count of strings that will be translated
- Derived output path: `{to-translate-folder}/{relative-path}/values-{locale}/strings.xml`

Stop and report if any check fails.

---

## Step 3: Confirm Before Proceeding

Present a summary via `ask_questions` (single confirmation question):

- Source files selected (list all paths)
- Translation mode in use
- Per source file:
  - Strings to **TRANSLATE** (count)
  - Strings to **COPY VERBATIM into baseline** (count, above-marker only)
  - Strings to **OMIT** (count, `translatable="false"`)
  - Output path: `{to-translate-folder}/{relative-path}/values-{locale}/strings.xml`
- Target locale count + list (first 5, then "... and N more")
- To-translate working folder
- Exclusion/keep-in-English terms loaded

**Do not start any file operations until the user explicitly confirms.**

---

## Step 4: Extract Strings to Translate (Mode B only)

> Skip this step for Mode A — use the source file directly as translation input.

For Mode B (marker mode):

1. Read the source `values/strings.xml`
2. Collect all `<string>` entries **below** the marker comment, **excluding** any with `translatable="false"`
3. Write them as a new valid XML file to `{to-translate-folder}/values/strings.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <resources>
       <!-- extracted strings here -->
   </resources>
   ```
4. Report: "Extracted N strings to `{to-translate-folder}/values/strings.xml`"

This file becomes the translation input for Step 5.

---

## Step 5: Apply Translation Rules

See [./references/translation-rules.md](./references/translation-rules.md) for the full rule set.

Key rules in priority order per string:
1. `translatable="false"` → **already excluded in Step 4; skip**
2. All remaining strings in the extracted file → **translate**

Brand names, abbreviations, and verbatim string keys are never translated — full details in the reference.

---

## Step 6: Execute Translation

Translate in the **smallest possible batch**: one source file × one locale at a time.

For each source file:
1. Translate into the first locale, write the output file, report the full output path
2. Continue locale by locale — do not bundle multiple locales into a single model call
3. After every locale, confirm the file was written before moving to the next
4. After all locales for a source file are complete, report a per-file summary before moving to the next source file

Output path per file per locale:
```
{to-translate-folder}/{relative-source-path}/values-{locale}/strings.xml
```

- Flag ambiguous translations in the post-run summary rather than silently choosing one

---

## Step 7: Post-Run Report

Report:
- Per source file:
  - Output folder: `{to-translate-folder}/{relative-source-path}/`
  - Locale files created (count and list)
  - Counts: translated vs. omitted
  - Strings or locales with ambiguous translations (flagged for review)
  - Any skipped strings and why
- Reminder to spot-check regional variants (`fr-rCA`, `pt-rBR`, `es-rUS`, etc.)
- **Next step reminder** (Mode B): run the merge script to combine baseline + new translations into the final output

---

## After Translation: Merge Step

If working with Mode B (incremental with a baseline), run the merge script to combine the baseline locale files with the new translations.

The script is included in this skill at [./assets/scripts/merge-translations.ps1](./assets/scripts/merge-translations.ps1). Copy it to your project's `scripts/` folder, then run from your project root:

```powershell
.\scripts\merge-translations.ps1 `
  -SourceBase "data/inputs/my-app/baseline" `
  -TranslateBase "data/inputs/my-app/to-translate" `
  -OutputBase "data/inputs/my-app/output" `
  -Marker "Need translations for everything below this line"
```

All four parameters are required — there are no hardcoded defaults.

To clear the to-translate working area before a new run, use [./assets/scripts/clear-locale-files.ps1](./assets/scripts/clear-locale-files.ps1):

```powershell
# Run from project root, targeting your to-translate folder
.\scripts\clear-locale-files.ps1 -WorkingDir "data/inputs/my-app/to-translate"

# Or clear specific locales only
.\scripts\clear-locale-files.ps1 -WorkingDir "data/inputs/my-app/to-translate" -Locales "ar,de,fr"
```
