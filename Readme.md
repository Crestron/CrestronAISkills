# CrestronAISkills

> A community-powered registry and marketplace for GitHub Copilot CLI skills — search, discover, and install skills directly from your terminal or the web.

[![Registry](https://img.shields.io/badge/skills-registry-blue)](registry.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🚀 What Is This?

CrestronAISkills is a **skills marketplace** for [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli). It provides:

- 🔍 **Search** skills by keyword, tag, or author
- 👀 **Browse** skill details, documentation, and install commands
- ⬇️ **Install** skills into your Copilot CLI with one command
- 📤 **Publish** your own skills via a pull request

---

## 🛠️ Using the Marketplace

### Option 1 — In-Terminal (Copilot CLI Extension)

The marketplace ships as a Copilot CLI extension. Once installed, search and install skills without leaving your terminal:

```
# Search for skills
search for skills about home automation in the marketplace

# Get skill details
show me details for the example-skill in the marketplace

# Install a skill
install the example-skill from the marketplace
```

**Installing the marketplace extension:**

1. Copy `.github/extensions/marketplace/` to `~/.copilot/extensions/marketplace/`
2. Restart Copilot CLI

### Option 2 — Web UI

Browse the marketplace at: **https://CrestronEng.github.io/CrestronAISkills**

---

## 📦 Installing a Skill Manually

1. Find the skill in `skills/<skill-name>/`
2. Copy the folder to `~/.copilot/extensions/<skill-name>/`
3. Restart Copilot CLI

---

## 📝 Publishing a Skill

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick summary:**
1. Fork this repo
2. Create `skills/<your-skill-name>/` with `skill.json`, `extension.mjs`, and `README.md`
3. Open a pull request — CI will validate your skill automatically

---

## 📂 Repository Structure

```
CrestronAISkills/
├── registry.json              # Master index of all skills (auto-generated)
├── skill-schema.json          # JSON Schema for skill.json validation
├── skills/
│   └── <skill-name>/
│       ├── skill.json         # Skill manifest
│       ├── extension.mjs      # Copilot CLI extension entry point
│       └── README.md          # Skill documentation
├── web/                       # React web UI (GitHub Pages)
└── .github/
    ├── extensions/
    │   └── marketplace/       # Copilot CLI marketplace extension
    └── workflows/             # CI/CD pipelines
```

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

MIT
