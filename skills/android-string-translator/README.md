# android-string-translator

A GitHub Copilot skill that translates Android `strings.xml` files into multiple locales. Copilot guides you through the process interactively — no scripts to write, no manual XML editing.

## Quick Start

### 1 — Copy the skill into your repo
```
.github/skills/android-string-translator/   →   copy entire folder to your repo
```

### 2 — Copy the bundled assets to your project root

| From `assets/` | To project root | Purpose |
|----------------|-----------------|---------|
| `translation_config.json` | `translation_config.json` | Pipeline config — update paths and rules for your project |
| `target_languages_crestron.txt` | `target_languages.txt` | Locale list — edit to match your project |
| `target_languages_crestron.csv` | `target_languages.csv` | Human-readable locale reference |
| `scripts/merge-translations.ps1` | `scripts/merge-translations.ps1` | Merges baseline + new translations into final output |
| `scripts/clear-locale-files.ps1` | `scripts/clear-locale-files.ps1` | Clears the working area before a new translation run |

### 3 — Wire up Copilot

Add this to `.github/copilot-instructions.md` in your repo:
```
When the user asks to translate strings or localize an Android strings.xml file,
load and follow the android-string-translator skill.
```

### 4 — Run it

Open Copilot Chat in **Agent mode**, then type:
```
translate strings
```

Copilot will ask you a few questions (source folder, marker text, locale list, exclusion rules), show a confirmation summary, then translate and write all locale files automatically.

---

## What It Does

- Reads your English `strings.xml`
- Optionally extracts only strings below a marker comment (incremental mode)
- Skips strings tagged `translatable="false"`
- Applies brand-name and abbreviation exclusion rules
- Writes `values-{locale}/strings.xml` for every target locale
- Runs a critic/back-translation QA pass
- Reports results and flags anything needing review

See [SKILL.md](SKILL.md) for the full 7-step workflow and [references/translation-rules.md](references/translation-rules.md) for detailed translation rules.

## Requirements

- GitHub Copilot in **Agent mode**
- Model minimum: **Claude Sonnet 4.5** or **GPT-5.1**
- PowerShell 5.1+ (for the merge and clear scripts)
