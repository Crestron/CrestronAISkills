---
name: android-string-translator
version: 1.0.0
description: Translates Android strings.xml files into multiple locales with marker-based incremental updates, brand-name exclusion, and QA back-translation.
tags: [android, localization, translation, strings]
author: CrestronEng
license: MIT
argument-hint: 'Optional: path to strings.xml or project name'
---

# Android String Translator

Translates Android `strings.xml` files into multiple locales using a structured 6-step workflow. Supports two modes:

---

## Distributing This Skill

The skill folder is the single source of truth — all scripts, config, and locale reference files are bundled inside it. To deploy into any Android project repo:

### Step 1 — Copy the skill
```
.github/skills/android-string-translator/   →  copy entire folder to target repo
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
When the user asks to translate strings or localize an Android strings.xml file,
load and follow the android-string-translator skill.
```
Without this, users can still invoke the skill manually with `/android-string-translator` in Copilot Chat.

---

- **Mode A — From scratch**: Translate all strings in the file into target locales. The source `values/strings.xml` is used directly as the translation input.
- **Mode B — Incremental**: A marker comment in the source `strings.xml` divides the file. The skill automatically extracts strings below the marker into a `to-translate/values/strings.xml` working file, then translates from there. Strings above the marker are preserved in the existing baseline locale files and merged in after translation.

Strings tagged `translatable="false"` are **always omitted** from all locale output files regardless of mode or marker position. Android resolves them at runtime from the base `values/` folder.

---

## Step 1: Gather Inputs

Use `ask_questions` to collect all inputs before doing any work. Batch related questions (max 4 per call).

### Batch 1 — Source and Marker

1. **Source folder** — Full or workspace-relative path to the folder containing the master `values/strings.xml` (the baseline/source folder, not to-translate).
2. **Translation mode** — How to identify which strings to translate:
   - **Marker comment** — strings BELOW a specific comment are extracted and translated; strings above stay in the baseline locale files
   - **`translatable="false"` only** — strings with this attribute are excluded; all others are translated
   - **Both** — marker as primary boundary AND honour `translatable="false"` within the translatable zone
3. **Marker text** — If using a marker, ask for the **exact text** of the comment (e.g. `Need translations for everything below this line`). Do NOT infer it from the file — always ask.

### Batch 2 — Target Locales and Output Location

1. **Locale source** — Read from a file (e.g. `target_languages.txt`, one code per line) or pasted directly? A default Crestron 31-locale list is available at [./assets/target_languages_crestron.txt](./assets/target_languages_crestron.txt).
2. **To-translate working folder** — Parent folder where the extracted `values/strings.xml` and translated `values-{locale}/strings.xml` files will be written (e.g. `data/inputs/my-app/to-translate`).

### Batch 3 — Exclusion Rules

1. **Exclusion list** — Read from a file (e.g. `translation_config.json`) or provided now? A template config is available at [./assets/translation_config.template.json](./assets/translation_config.template.json).
2. **Format confirmation** — Confirm the source file uses standard Android XML: `<string name="key">value</string>`, with `\'` for apostrophes and `\n` for line breaks.

---

## Step 2: Validate Source File

Read the source `values/strings.xml` and verify:

- Valid Android XML with `<resources>` root
- Contains `<string name="...">` entries
- Marker comment exists in file (if marker mode selected)

Report:
- Total string entries
- Count with `translatable="false"` (omitted from all locale files)
- Count above the marker (stays in baseline, not re-translated) — if marker mode
- Count below the marker (translation candidates) — if marker mode
- Final count of strings that will be translated

Stop and report if any check fails.

---

## Step 3: Confirm Before Proceeding

Present a summary via `ask_questions` (single confirmation question):

- Source file path
- Translation mode in use
- Strings to **TRANSLATE** (count)
- Strings to **COPY VERBATIM into baseline** (count, above-marker only)
- Strings to **OMIT** (count, `translatable="false"`)
- Target locale count + list (first 5, then "... and N more")
- To-translate working folder
- Exclusion/keep-in-English terms loaded
- Expected output: N locale files at `{to-translate-folder}/values-{locale}/strings.xml`

**Do not start any file operations until the user explicitly confirms.**

---

## Step 4: Extract Strings to Translate (Mode B only)

> Skip this step for Mode A — use the source file directly as translation input.

For Mode B (marker mode):

1. Read the source `values/strings.xml`
2. Collect all `<string>` entries **below** the marker comment, **excluding** any with `translatable="false"`
3. Write them as a new valid Android XML file to `{to-translate-folder}/values/strings.xml`:
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

- Process all target locales
- For each locale, write `{to-translate-folder}/values-{locale}/strings.xml`
- Each output file contains all strings from the extracted `values/strings.xml` translated into that locale
- Report progress after every 5 locales
- Flag ambiguous translations in the post-run summary rather than silently choosing one

---

## Step 7: Post-Run Report

Report:
- Extracted strings written to `to-translate/values/strings.xml` (count)
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
