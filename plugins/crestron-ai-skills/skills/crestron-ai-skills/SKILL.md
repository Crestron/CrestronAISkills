---
name: crestron-ai-skills
description: Search and inspect skills in the CrestronAISkills plugin marketplace (github.com/Crestron/CrestronAISkills), and tell the user how to install them. Trigger when the user asks to browse, search, find, get info on, install, or list Crestron AI skills, or mentions the "CrestronAISkills" registry or marketplace.
---

# Crestron AI Skills Registry

Browse the skills published in the Crestron/CrestronAISkills plugin marketplace. Skills are installed only through the user's AI tool's plugin marketplace: never download, copy or write skill files yourself.

## Config

- Base URL: `https://raw.githubusercontent.com/Crestron/CrestronAISkills/main`
- Catalog: `<base>/.claude-plugin/marketplace.json`. Its `plugins` array lists every published skill: `name`, `description`, `keywords` (the tags), `author.name`, `source` (`./plugins/<name>`). Skip the entry named `crestron-ai-skills`: that is this registry browser, not a skill.
- Skill details: `<base>/plugins/<name>/.claude-plugin/plugin.json` has the skill's `version`, `license` and `homepage`.

Note: the org is **Crestron**, not `CrestronEng`.

## Search skills

1. Fetch the catalog: `curl -fsSL <base>/.claude-plugin/marketplace.json`.
2. If the user gave a tag, keep only skills whose `keywords` contain it (case-insensitive exact match).
3. If the user gave a query, score each remaining skill: name match +10, description match +5, keyword match +8, author match +3 (per matched term, case-insensitive substring). Drop zero-score skills, sort descending by score.
4. Cap results to the requested limit (default 10; no query or tag = list all up to the limit).
5. For each result, fetch its `plugin.json` for the version. Present a numbered list: `**name** vVERSION by AUTHOR`, then the description, then `Tags: ...`. If nothing matches, say so and suggest broadening the query.

## Get skill info

1. Fetch the catalog and find the skill whose `name` matches case-insensitively. If not found, say so and suggest a search.
2. Fetch its `plugin.json`. Show: name, version, author, license, description, tags, homepage (if present).
3. Add how to install it (below).

## Install a skill

Confirm the skill is in the catalog, then give the user the install step for their tool. Each skill is its own plugin named `<name>@crestron-ai-skills`:

- **Claude Code:** `/plugin install <name>@crestron-ai-skills` in a session, or `claude plugin install <name>@crestron-ai-skills`. Then `/reload-plugins` or start a new session.
- **GitHub Copilot CLI:** `copilot plugin install <name>@crestron-ai-skills`.
- **Claude desktop app:** **Customize → Plugins**, open the Crestron AI Skills marketplace, and install `<name>`.
- **VS Code:** in the Extensions view, search `@agentPlugins` and install `<name>`.
- **OpenAI Codex:** run `/plugins` in a session and install `<name>`.

If the marketplace isn't added yet, the user adds it once first (e.g. `claude plugin marketplace add Crestron/CrestronAISkills` or `copilot plugin marketplace add Crestron/CrestronAISkills`); the [README](https://github.com/Crestron/CrestronAISkills#add-the-marketplace-as-a-plugin) has the steps for every tool.

## List installed skills

Use the tool's own plugin list rather than reading directories: `claude plugin list` (Claude Code), the `copilot plugin` commands (Copilot CLI; see `copilot plugin --help`), **Customize → Plugins** (Claude desktop), `@agentPlugins` in the Extensions view (VS Code), `/plugins` (Codex). Report the Crestron skills (plugins ending in `@crestron-ai-skills`) and their versions; if there are none, suggest a search.
