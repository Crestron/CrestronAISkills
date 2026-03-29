# CrestronAISkills

> An internal marketplace for GitHub Copilot skills — browse, install, and auto-update Copilot instruction skills tailored for Crestron engineers.

[![Skills](https://img.shields.io/badge/skills-registry-blue)](registry.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What Is This?

CrestronAISkills is an **internal skills marketplace** for [GitHub Copilot](https://docs.github.com/copilot). It provides:

- Search and browse skills by keyword, tag, or author
- Install skills with a one-click installer script
- Auto-update via Task Scheduler (Windows) or cron/launchd (Mac/Linux)
- Publish your own skills via a pull request

---

## Before You Start — Create a GitHub PAT

The installer needs a **Personal Access Token (PAT)** to download skills from this private repository. You only need to do this once.

### Steps to create your PAT

1. Go to **GitHub** and sign in
2. Click your **profile picture** (top right) → **Settings**
3. Scroll down the left sidebar → click **Developer settings**
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token (classic)**
6. Fill in the form:
   - **Note**: `CrestronAISkills` (so you remember what it's for)
   - **Expiration**: `1 year` (or `No expiration` for a shared machine)
   - **Scopes**: tick **`repo`** (this gives read access to private repos)
7. Click **Generate token**
8. **Copy the token immediately** — GitHub will not show it again

> Keep this token private. Do not share it or commit it to any repository.

---

## Installing a Skill

### Step 1 — Browse the Marketplace

Open the web UI: **https://friendly-system-1qwlq3v.pages.github.io/**

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
.\install.ps1 -Token <your-github-pat> -ProjectPath "C:\path\to\your\project"
```

**Mac/Linux (bash):**
```bash
chmod +x install.sh
./install.sh --token <your-github-pat> --project /path/to/your/project
```

Replace `<your-github-pat>` with the token you created above, and set the project path to the root of the repo you want the skill installed into.

The installer will:
1. Download the skill to `<project>/.github/skills/<skill-name>/skill.md`
2. Save your token and metadata to `~/.copilot/skills/`
3. Register a **weekly auto-update task** (Task Scheduler on Windows, cron on Mac/Linux)

### Step 4 — Use the Skill in Copilot

The skill is now active in your project. GitHub Copilot picks it up automatically from `.github/skills/`.

---

## Updating Skills

**Check all installed skills for updates manually:**

```powershell
# Windows
~/.copilot/skills/check-updates.ps1
```
```bash
# Mac/Linux
~/.copilot/skills/check-updates.sh
```

Auto-updates also run weekly in the background — no action needed.

---

## Publishing a Skill

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick summary:**
1. Fork this repo
2. Create `skills/<your-skill-name>/skill.md` with YAML frontmatter and Copilot instructions
3. Open a pull request — CI will validate your skill automatically
4. Once merged, the registry updates automatically and your skill appears in the marketplace

---

## Repository Structure

```
CrestronAISkills/
├── registry.json              # Auto-generated index of all skills
├── skill-schema.json          # JSON Schema for skill.md frontmatter validation
├── skills/
│   └── <skill-name>/
│       └── skill.md           # Copilot skill (YAML frontmatter + instructions)
├── scripts/
│   ├── install-skill-template.ps1   # Windows installer template
│   ├── install-skill-template.sh    # Mac/Linux installer template
│   ├── check-updates.ps1            # Windows manual update checker
│   ├── check-updates.sh             # Mac/Linux manual update checker
│   └── deploy.ps1                   # Local deploy script
├── web/                       # React+Vite web UI (served via GitHub Pages)
└── .github/
    └── workflows/             # CI/CD pipelines (validate, registry update, deploy)
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## License

MIT
