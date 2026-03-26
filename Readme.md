# CrestronAISkills

> A community-powered registry and marketplace for GitHub Copilot skills — search, discover, and use Copilot instruction skills directly from the web or by copying a single markdown file.

[![Registry](https://img.shields.io/badge/skills-registry-blue)](registry.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🚀 What Is This?

CrestronAISkills is a **skills marketplace** for [GitHub Copilot](https://docs.github.com/copilot). It provides:

- 🔍 **Search** skills by keyword, tag, or author
- 👀 **Browse** skill details and Copilot instructions
- ⬇️ **Install** skills with a single `curl` command
- 📤 **Publish** your own skills via a pull request

---

## 🛠️ Using the Marketplace

### Option 1 — Web UI

Browse the marketplace at: **https://CrestronEng.github.io/CrestronAISkills**

### Option 2 — Manual Download

Download any skill's `skill.md` directly and add it to your repo or personal instructions folder:

```bash
# Copy to your repo's .github/ folder
curl -o .github/<skill-name>.md https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/skills/<skill-name>/skill.md

# Or copy to your personal Copilot instructions folder
curl -o ~/.copilot/instructions/<skill-name>.md https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/skills/<skill-name>/skill.md
```

---

## 📝 Publishing a Skill

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick summary:**
1. Fork this repo
2. Create `skills/<your-skill-name>/skill.md` with YAML frontmatter and Copilot instructions
3. Open a pull request — CI will validate your skill automatically

---

## 📂 Repository Structure

```
CrestronAISkills/
├── registry.json              # Master index of all skills (auto-generated)
├── skill-schema.json          # JSON Schema for skill.md frontmatter validation
├── skills/
│   └── <skill-name>/
│       └── skill.md           # Copilot skill (frontmatter + instructions)
├── web/                       # React web UI (GitHub Pages)
└── .github/
    ├── extensions/
    │   └── marketplace/       # Copilot marketplace discovery extension
    └── workflows/             # CI/CD pipelines
```

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

MIT
