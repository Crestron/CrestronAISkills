# CrestronAISkills

> An internal marketplace for GitHub Copilot skills — browse, install, and auto-update Copilot instruction skills tailored for Crestron engineers.

[![Skills](https://img.shields.io/badge/skills-registry-blue)](registry.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🚀 What Is This?

CrestronAISkills is an **internal skills marketplace** for [GitHub Copilot](https://docs.github.com/copilot). It provides:

- 🔍 **Search & browse** skills by keyword, tag, or author
- ⬇️ **Install** skills with a one-click installer script
- 🔄 **Auto-update** via Task Scheduler (Windows) or cron/launchd (Mac/Linux)
- 📤 **Publish** your own skills via a pull request

---

## 🛠️ Installing a Skill

### Step 1 — Browse the Marketplace

Open the web UI and find a skill you want.

### Step 2 — Download & Run the Installer

From the skill's detail page, click **"Download & Install"** to get a zip containing:
- `install-<skill-name>.ps1` (Windows) or `install-<skill-name>.sh` (Mac/Linux)

**Windows (PowerShell):**
```powershell
.\install-<skill-name>.ps1 -Token <your-github-pat> -ProjectPath "C:\path\to\your\project"
```

**Mac/Linux (bash):**
```bash
chmod +x install-<skill-name>.sh
./install-<skill-name>.sh --token <your-github-pat> --project /path/to/your/project
```

The installer will:
1. Download the skill to `<project>/.github/skills/<skill-name>/skill.md`
2. Save metadata to `~/.copilot/skills/`
3. Register a weekly auto-update task (Task Scheduler / cron / launchd)

### Step 3 — Use the Skill in Copilot

The skill is now available in your project. Copilot will pick it up from `.github/skills/`.

---

## 🔄 Updating Skills

**Check all installed skills for updates:**

```powershell
# Windows
~/.copilot/skills/check-updates.ps1
```
```bash
# Mac/Linux
~/.copilot/skills/check-updates.sh
```

Auto-updates run weekly in the background via Task Scheduler / cron / launchd.

---

## 📝 Publishing a Skill

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick summary:**
1. Fork this repo
2. Create `skills/<your-skill-name>/skill.md` with YAML frontmatter and Copilot instructions
3. Open a pull request — CI will validate your skill automatically
4. Once merged, the registry updates automatically and your skill appears in the marketplace

---

## 📂 Repository Structure

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

## 🔑 GitHub PAT Requirements

The installer requires a GitHub Personal Access Token (PAT) with:
- `repo` scope (to read private repo contents)

Store your token securely — it is saved to `~/.copilot/skills/github-token` on your machine and used only for downloading skills and checking updates from this repo.

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

MIT
