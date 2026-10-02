# CrestronAISkills

> A marketplace for AI assistant skills — browse, install, and auto-update skills for **GitHub Copilot** and **Claude Code**.

[![Skills](https://img.shields.io/badge/skills-registry-blue)](registry.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-blue)](LICENSE)

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Add the Marketplace as a Plugin](#add-the-marketplace-as-a-plugin)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Desktop App](#claude-desktop-app)
  - [GitHub Copilot CLI](#github-copilot-cli)
  - [GitHub Copilot in VS Code](#github-copilot-in-vs-code)
  - [Using the Plugin](#using-the-plugin)
- [Installing a Skill](#installing-a-skill)
  - [Step 1 — Browse the Marketplace](#step-1--browse-the-marketplace)
  - [Step 2 — Download the Installer](#step-2--download-the-installer)
  - [Step 3 — Run the Installer](#step-3--run-the-installer)
  - [Step 4 — Use the Skill](#step-4--use-the-skill)
- [Manual Install](#manual-install)
  - [GitHub Copilot](#github-copilot)
  - [Claude Code](#claude-code)
- [Updating Skills](#updating-skills)
- [Repository Structure](#repository-structure)
- [License](#license)

---

## What Is This?

CrestronAISkills is a **skills marketplace** for AI coding assistants. Each skill is a focused instruction file that shapes how your AI assistant behaves in a project. It provides:

- Search and browse skills by keyword, tag, or author
- Install skills with a one-click installer script
- Auto-update via Task Scheduler (Windows) or cron/launchd (Mac/Linux)
- Works with **GitHub Copilot** and **Claude Code**
- Add the whole marketplace as a plugin in Claude Code, the Claude desktop app, GitHub Copilot CLI, or VS Code

---

## Add the Marketplace as a Plugin

The fastest way to get Crestron AI Skills is to add this repository as a **plugin marketplace** in your AI tool, then install the `crestron-ai-skills` plugin from it. Every tool follows the same two steps: **add the marketplace → install the plugin**.

### Claude Code (CLI)

```bash
claude plugin marketplace add Crestron/CrestronAISkills
claude plugin install crestron-ai-skills@crestron-ai-skills
```

Or from inside a Claude Code session:

```
/plugin marketplace add Crestron/CrestronAISkills
/plugin install crestron-ai-skills@crestron-ai-skills
```

Restart Claude Code (or start a new session) so the plugin loads. Confirm with `claude plugin list`.

### Claude Desktop App

1. Open **Customize** in the left sidebar → **Plugins**.
2. Click **Add** → **Add marketplace** → **Add from a repository**.
3. Enter `Crestron/CrestronAISkills` and install the **crestron-ai-skills** plugin.

Requires a paid Claude plan. In the **Code** tab you can also run the `/plugin` commands shown above — the Code tab shares plugin settings with the Claude Code CLI, so installing in either makes the plugin available in both.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add Crestron/CrestronAISkills
copilot plugin install crestron-ai-skills@crestron-ai-skills
```

Or from inside a `copilot` session:

```
/plugin marketplace add Crestron/CrestronAISkills
/plugin install crestron-ai-skills@crestron-ai-skills
```

Start a new `copilot` session so the plugin loads. Confirm with `copilot plugin list`.

### GitHub Copilot in VS Code

1. Open **Settings (JSON)** and add the marketplace:
   ```json
   "chat.plugins.enabled": true,
   "chat.plugins.marketplaces": ["Crestron/CrestronAISkills"]
   ```
2. In the Extensions view, search **`@agentPlugins`** (or run **Chat: Plugins** from the Command Palette) and install **crestron-ai-skills**.
3. Use Copilot Chat in **Agent mode**.

### Using the Plugin

The plugin adds a **registry browser** skill — it does not add slash commands or buttons, so it's normal to see no visible change after installing. Ask in plain language:

- *"search the Crestron AI skills registry"*
- *"show me info on string-translator"*
- *"install the hello-world skill"*

**Troubleshooting**
- **Nothing happens after installing** — plugins load at session start. Restart the tool or open a new session.
- **Marketplace add fails** — make sure you can access `github.com/Crestron/CrestronAISkills` with your GitHub credentials (e.g. run `gh auth login`).
- **Registry errors** — the skill reads https://crestron.github.io/CrestronAISkills/registry.json; confirm that URL loads in your browser.

---

## Installing a Skill

### Step 1 — Browse the Marketplace

Open the web UI: **https://crestron.github.io/CrestronAISkills/**

Find a skill and click it to open the detail page.

### Step 2 — Download the Installer

On the skill's detail page, go to the **Install** tab and click **"Download & Install"**.

This downloads a zip file containing:
- `install.ps1` — Windows installer
- `install.sh` — Mac/Linux installer
- `skill.md` — the skill file itself

Extract the zip, then run the installer from a terminal.

### Step 3 — Run the Installer

**Windows (PowerShell):**
```powershell
.\install.ps1 -ProjectPath "C:\path\to\your\project"
```

**Mac/Linux (bash):**
```bash
chmod +x install.sh
./install.sh --project /path/to/your/project
```

Set the project path to the root of the repo you want the skill installed into.

The installer will:
1. Copy the skill to `.github/skills/<skill-name>/skill.md` for GitHub Copilot
2. Copy the skill to `.claude/commands/<skill-name>.md` for Claude Code
3. Save install metadata and update scripts to `~/.copilot/skills/` (Copilot) and `~/.claude/skills/` (Claude Code)
4. Register a **daily auto-update check** (Task Scheduler on Windows, cron/launchd on Mac/Linux)

### Step 4 — Use the Skill

**GitHub Copilot** picks up skills automatically from `.github/skills/` in your project.

**Claude Code** makes the skill available as a slash command — type `/<skill-name>` in Claude Code to activate it.

---

## Manual Install

If you prefer not to use the installer, clone the repo and copy the skill file manually.

```bash
git clone https://github.com/Crestron/CrestronAISkills
```

### GitHub Copilot

Copy the skill file into your project:

```bash
mkdir -p <your-project>/.github/skills/<skill-name>
cp CrestronAISkills/skills/<skill-name>/skill.md <your-project>/.github/skills/<skill-name>/skill.md
```

GitHub Copilot automatically reads instruction files from `.github/skills/` in your project root.

### Claude Code

Copy the skill body (the content below the `---` frontmatter) into your project's Claude commands folder:

```bash
mkdir -p <your-project>/.claude/commands
# Strip the YAML frontmatter, keep only the instruction body
awk '/^---$/{n++; next} n>=2{print}' CrestronAISkills/skills/<skill-name>/skill.md \
  > <your-project>/.claude/commands/<skill-name>.md
```

The skill will be available as `/<skill-name>` in Claude Code.

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force "<your-project>\.claude\commands" | Out-Null
$lines = Get-Content "CrestronAISkills\skills\<skill-name>\skill.md"
$start = ($lines | Select-String '^---$').LineNumber[1]
$lines[$start..($lines.Length-1)] | Set-Content "<your-project>\.claude\commands\<skill-name>.md"
```

---

## Updating Skills

**Check all installed skills for updates manually:**

```powershell
# Windows — Copilot path
~\.copilot\skills\check-updates.ps1
# Windows — Claude Code path
~\.claude\skills\check-updates.ps1
```
```bash
# Mac/Linux — Copilot path
~/.copilot/skills/check-updates.sh
# Mac/Linux — Claude Code path
~/.claude/skills/check-updates.sh
```

Auto-updates also run daily in the background — no action needed.

---

## Repository Structure

```
CrestronAISkills/
├── registry.json              # Auto-generated index of all skills
├── skill-schema.json          # JSON Schema for skill.md frontmatter validation
├── skills/
│   └── <skill-name>/
│       └── skill.md           # Skill file (YAML frontmatter + instructions)
├── scripts/
│   ├── install-skill-template.ps1   # Windows installer template
│   ├── install-skill-template.sh    # Mac/Linux installer template
│   ├── check-updates.ps1            # Windows manual update checker
│   └── check-updates.sh             # Mac/Linux manual update checker
├── web/                       # React+Vite web UI (served via GitHub Pages)
└── .github/
    └── workflows/             # CI/CD pipelines (validate, registry update, deploy)
```

---

## License

See [LICENSE](LICENSE).
