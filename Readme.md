# CrestronAISkills

> A marketplace for AI assistant skills — browse, install, and auto-update skills for **Claude**, **GitHub Copilot**, and **OpenAI Codex**.

[![Skills](https://img.shields.io/badge/skills-registry-blue)](https://crestron.github.io/CrestronAISkills/registry.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-blue)](LICENSE)

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Add the Marketplace as a Plugin](#add-the-marketplace-as-a-plugin)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Desktop App](#claude-desktop-app)
  - [GitHub Copilot CLI](#github-copilot-cli)
  - [GitHub Copilot in VS Code](#github-copilot-in-vs-code)
  - [OpenAI Codex](#openai-codex)
  - [Keep Skills Up to Date](#keep-skills-up-to-date)
  - [Using the Skills](#using-the-skills)
- [Alternative: Installer Script](#alternative-installer-script)
  - [Step 1 — Browse the Marketplace](#step-1--browse-the-marketplace)
  - [Step 2 — Download the Installer](#step-2--download-the-installer)
  - [Step 3 — Run the Installer](#step-3--run-the-installer)
  - [Step 4 — Use the Skill](#step-4--use-the-skill)
- [Alternative: Manual Install](#alternative-manual-install)
  - [GitHub Copilot](#github-copilot)
  - [Claude Code](#claude-code)
- [Updating Script and Manual Installs](#updating-script-and-manual-installs)
- [Repository Structure](#repository-structure)
- [License](#license)

---

## What Is This?

CrestronAISkills is a **skills marketplace** for AI coding assistants. Each skill is a focused instruction file that shapes how your AI assistant behaves in a project. It provides:

- Every skill published as its own **plugin** — install just the skills you need in Claude Code, the Claude desktop app, GitHub Copilot CLI, VS Code, or OpenAI Codex
- Automatic updates through each tool's marketplace auto-update
- Search and browse skills by keyword, tag, or author in the web portal
- Alternative install paths: a downloadable installer script or manual copy

---

## Add the Marketplace as a Plugin

<!-- The web portal renders the five tool install sections below and the "… auto-update" / "… updates"
     sections under "Keep Skills Up to Date" in pop-ups (headings listed in web/src/data/install-sections.json).
     If you rename one of those headings, update that file too — CI fails if a heading is missing. -->

The fastest way to get Crestron AI Skills is to add this repository as a **plugin marketplace** in your AI tool, then install the skills you want. Every tool follows the same two steps: **add the marketplace → install skills**.

**Every published skill is its own plugin**, named after the skill — for example `hello-world` or `example-skill`. Install each one as `<skill-name>@crestron-ai-skills`. Browse the full list in the [web portal](https://crestron.github.io/CrestronAISkills/) or in your tool's plugin browser after adding the marketplace.

Optionally, also install **`crestron-ai-skills`** — a registry browser skill that searches the catalog and answers questions like *"what Crestron skills are available?"*.

### Claude Code (CLI)

```bash
claude plugin marketplace add Crestron/CrestronAISkills
claude plugin install hello-world@crestron-ai-skills
```

Repeat the install line for each skill you want. Or from inside a Claude Code session:

```
/plugin marketplace add Crestron/CrestronAISkills
/plugin install hello-world@crestron-ai-skills
```

Run `/plugin` with no arguments to browse every skill in the marketplace. Restart Claude Code (or start a new session, or run `/reload-plugins`) so new skills load. Confirm with `claude plugin list`.

### Claude Desktop App

1. Open **Customize** in the left sidebar → **Plugins**.
2. Click **Add** → **Add marketplace** → **Add from a repository**.
3. Enter `Crestron/CrestronAISkills`. Each skill appears as its own plugin — install the ones you want.

Requires a paid Claude plan. In the **Code** tab you can also run the `/plugin` commands shown above — the Code tab shares plugin settings with the Claude Code CLI, so installing in either makes the skill available in both.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add Crestron/CrestronAISkills
copilot plugin install hello-world@crestron-ai-skills
```

Repeat the install line for each skill you want; `copilot plugin marketplace browse crestron-ai-skills` lists them all. Or from inside a `copilot` session:

```
/plugin marketplace add Crestron/CrestronAISkills
/plugin install hello-world@crestron-ai-skills
```

Start a new `copilot` session so new skills load. Confirm with `copilot plugin list`.

### GitHub Copilot in VS Code

1. Open **Settings (JSON)** and add the marketplace:
   ```json
   "chat.plugins.enabled": true,
   "chat.plugins.marketplaces": ["Crestron/CrestronAISkills"]
   ```
2. In the Extensions view, search **`@agentPlugins`** (or run **Chat: Plugins** from the Command Palette). Each Crestron skill appears as its own plugin — install the ones you want.
3. Use Copilot Chat in **Agent mode**.

### OpenAI Codex

```bash
codex plugin marketplace add Crestron/CrestronAISkills
```

Then run `/plugins` in a Codex session (or open the **Plugins** directory in the Codex / ChatGPT desktop app). Each Crestron skill appears as its own plugin — install the ones you want, then start a new session so they load. Confirm the marketplace with `codex plugin marketplace list`.

### Keep Skills Up to Date

Every skill change ships with a new version number, and each tool picks it up from the marketplace. Auto-update is **off by default** for marketplaces you add yourself, so turn it on once after adding the Crestron marketplace — or use the update commands for tools that don't support it.

| Tool | Automatic updates | How |
| --- | --- | --- |
| Claude Code (CLI) | Yes — turn on once | `/plugin` → **Marketplaces** |
| Claude desktop app | Code tab: yes (shares Claude Code settings) · Chat: check manually | **Customize → Plugins** |
| GitHub Copilot CLI | Yes — turn on once | `~/.copilot/settings.json` |
| VS Code (GitHub Copilot) | Yes — every 24 hours | `extensions.autoUpdate` setting |
| OpenAI Codex | Yes — turn on once | `/plugins` → **Marketplaces**, or `~/.codex/config.toml` |

#### Claude Code (CLI) auto-update

Turn on auto-update once:

1. Start a session with `claude` and run `/plugin`.
2. Open the **Marketplaces** tab and select **crestron-ai-skills**.
3. Choose **Enable auto-update**.

Claude Code then refreshes the marketplace each time a session starts. When a skill updates you'll see `Plugin updated: <name> · Run /reload-plugins to apply`; new sessions load the new version automatically. To update immediately, select **Update marketplace** on the same screen.

#### Claude desktop app updates

- **Code tab:** it uses the same settings as the Claude Code CLI — turn on auto-update with the Claude Code (CLI) steps and it covers the Code tab too.
- **Chat / Customize:** open **Customize → Plugins**, open the **Crestron AI Skills** marketplace, and select **Check for updates**. If **Sync automatically** is offered for the marketplace, turn it on.

#### GitHub Copilot CLI auto-update

Turn on auto-update in your Copilot settings file:

1. Open `~/.copilot/settings.json` (Windows: `%USERPROFILE%\.copilot\settings.json`). Adding the marketplace already created a `crestron-ai-skills` entry under `extraKnownMarketplaces`.
2. Add `"autoUpdate": true` to that entry:

   ```json
   "extraKnownMarketplaces": {
     "crestron-ai-skills": {
       "source": { "source": "github", "repo": "Crestron/CrestronAISkills" },
       "autoUpdate": true
     }
   }
   ```

3. Save. Copilot CLI now updates the Crestron plugins at the start of each interactive session.

To update immediately instead, run `copilot plugin marketplace update` followed by `copilot plugin update` (with no name, it updates every installed plugin).

#### VS Code auto-update

Plugins update automatically every 24 hours while VS Code's extension auto-update is on (the default). To confirm, open **Settings**, search for `extensions.autoUpdate`, and make sure it isn't set to off. To update immediately, run **Extensions: Check for Extension Updates** from the Command Palette.

#### OpenAI Codex auto-update

Turn on auto-update in the app or in your config file:

- **Codex app or interactive CLI:**
  1. In a Codex session, type `/side` to open the sidebar, or go directly to the **Plugins** UI.
  2. Select **Marketplaces** and find **crestron-ai-skills**.
  3. Turn on **Enable Auto-Update** for it.

  Background updates then run as a startup task each time Codex starts.

- **Config file:** open `~/.codex/config.toml` (Windows: `%USERPROFILE%\.codex\config.toml`) and add:

  ```toml
  check_for_update_on_startup = true

  [updates]
  mode = "automatic"
  channel = "stable"
  ```

To update immediately instead, run `codex plugin marketplace upgrade crestron-ai-skills`.

### Using the Skills

Each installed skill works on its own. Your AI tool uses it automatically when a request matches the skill's description — there are no buttons, so it's normal to see no visible change after installing. You can also call a skill directly:

- **Claude (Code and desktop):** type `/<skill-name>:<skill-name>`, e.g. `/hello-world:hello-world`
- **Copilot and Codex:** describe the task; the matching skill loads automatically

If you installed the optional **`crestron-ai-skills`** registry browser, ask in plain language:

- *"search the Crestron AI skills registry"*
- *"show me info on example-skill"*

**Troubleshooting**
- **Nothing happens after installing** — plugins load at session start. Restart the tool, open a new session, or run `/reload-plugins` in Claude Code.
- **A skill is missing from the plugin list** — refresh the marketplace (see [Keep Skills Up to Date](#keep-skills-up-to-date)); new skills appear after a refresh.
- **Marketplace add fails** — the repository is public, so no GitHub account is needed, but `git` must be installed and `github.com` must be reachable from your network.
- **Registry errors** — the skill reads https://crestron.github.io/CrestronAISkills/registry.json; confirm that URL loads in your browser.
- **Network access blocked** — the skills need to reach `github.com`, `api.github.com`, `raw.githubusercontent.com`, and `crestron.github.io`. If your AI tool or organization blocks outside access, allow these hosts — see [NETWORK_ACCESS.md](NETWORK_ACCESS.md) for the steps in each tool.

---

## Alternative: Installer Script

For tools or projects where you can't use the plugin marketplace, each skill can also be installed into a single project with a downloadable installer. Marketplace installs (above) are recommended — they update through your tool and don't need a scheduled task.

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

## Alternative: Manual Install

If you prefer not to use the marketplace or the installer, clone the repo and copy the skill file manually.

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

## Updating Script and Manual Installs

This section applies only to skills installed with the installer script. **Marketplace installs update through your AI tool** — see [Keep Skills Up to Date](#keep-skills-up-to-date). Manual copies don't update; re-copy to refresh.

**Check script-installed skills for updates manually:**

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

The installer also registers a daily background check, so script installs update without action.

---

## Repository Structure

```
CrestronAISkills/
├── .claude-plugin/            # Marketplace catalog (Claude Code, Claude desktop, Copilot CLI, VS Code)
├── .agents/plugins/           # Marketplace catalog (OpenAI Codex)
├── skill-schema.json          # JSON Schema for skill.md frontmatter validation
├── skills/
│   └── <skill-name>/
│       └── skill.md           # Skill file (YAML frontmatter + instructions)
├── copilot-skills/
│   └── <skill-name>/
│       └── SKILL.md           # Mirror of skills/ (byte-identical) used for plugins and manual copy
├── scripts/
│   ├── install-skill-template.ps1   # Windows installer template
│   ├── install-skill-template.sh    # Mac/Linux installer template
│   ├── check-updates.ps1            # Windows manual update checker
│   └── check-updates.sh             # Mac/Linux manual update checker
├── plugins/
│   ├── crestron-ai-skills/    # Registry-browser plugin (hand-maintained)
│   └── <skill-name>/          # One plugin per published skill (generated by CI — don't edit)
├── web/                       # React+Vite web UI (served via GitHub Pages)
└── .github/
    └── workflows/             # CI/CD pipelines (validate, registry update, deploy)
```

---

## License

See [LICENSE](LICENSE).
