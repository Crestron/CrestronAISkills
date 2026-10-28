# CrestronAISkills

> A marketplace for AI assistant skills — browse, install, and auto-update skills for **Claude**, **GitHub Copilot**, and **OpenAI Codex**.

[![Skills](https://img.shields.io/badge/skills-browse-blue)](https://crestroneng.github.io/CrestronAISkills-portal/)
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
- [Network Access](#network-access)
- [Repository Structure](#repository-structure)
- [License](#license)

---

## What Is This?

CrestronAISkills is a **skills marketplace** for AI coding assistants. Each skill is a focused instruction file that shapes how your AI assistant behaves in a project. It provides:

- Every skill published as its own **plugin** — install just the skills you need in Claude Code, the Claude desktop app, GitHub Copilot CLI, VS Code, or OpenAI Codex
- Automatic updates through each tool's marketplace auto-update
- Search and browse skills by keyword, tag, or author in the [web portal](https://crestroneng.github.io/CrestronAISkills-portal/)

---

## Add the Marketplace as a Plugin

<!-- The web portal (CrestronEng/CrestronAISkills-portal) renders the five tool install sections below and the
     "… auto-update" / "… updates" sections under "Keep Skills Up to Date" in pop-ups, by the headings listed in
     that repo's src/data/install-sections.json. If you rename one of those headings, update that file too. -->

The fastest way to get Crestron AI Skills is to add this repository as a **plugin marketplace** in your AI tool, then install the skills you want. Every tool follows the same two steps: **add the marketplace → install skills**.

**Every published skill is its own plugin**, named after the skill — for example `hello-world` or `example-skill`. Install each one as `<skill-name>@crestron-ai-skills`. Browse the full list in the [web portal](https://crestroneng.github.io/CrestronAISkills-portal/) or in your tool's plugin browser after adding the marketplace.

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
| OpenAI Codex | No — update manually | `codex plugin marketplace upgrade` |

#### Claude Code (CLI) auto-update

Turn on auto-update once:

1. Start a session with `claude` and run `/plugin`.
2. Open the **Marketplaces** tab and select **crestron-ai-skills**.
3. Choose **Enable auto-update**.
4. Open `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`) and add `FORCE_AUTOUPDATE_PLUGINS` to the `env` block. This keeps plugin updates on even when an updater setting such as `DISABLE_AUTOUPDATER` turns Claude Code's own auto-update off:

   ```json
   "env": {
     "FORCE_AUTOUPDATE_PLUGINS": "1"
   }
   ```

   If the file already has an `env` block, add the line inside it, and keep a comma between top-level entries. Save, then start a new session.

Auto-update runs in the background **after you send your first message** in a session, within about ten minutes. When a skill updates you'll see `Plugin updated: <name> · Run /reload-plugins to apply`; run `/reload-plugins` or start a new session to load it. To update immediately, select **Update marketplace** on the **Marketplaces** tab.

#### Claude desktop app updates

- **Code tab:** it uses the same settings as the Claude Code CLI, so follow all four Claude Code (CLI) steps above. **Step 4 is required here:** the desktop app turns off Claude Code's own auto-updater in Code tab sessions (`DISABLE_AUTOUPDATER`), which also stops plugin updates unless `FORCE_AUTOUPDATE_PLUGINS` is set. Updates arrive after your first message in a new Code tab session.
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

To update immediately instead, run `copilot plugin marketplace update` followed by `copilot plugin update --all` (or `copilot plugin update <skill-name>@crestron-ai-skills` for one skill).

#### VS Code auto-update

Plugins update automatically every 24 hours while VS Code's extension auto-update is on (the default). To confirm, open **Settings**, search for `extensions.autoUpdate`, and make sure it isn't set to off. To update immediately, run **Extensions: Check for Extension Updates** from the Command Palette.

#### OpenAI Codex updates

Codex doesn't document an auto-update setting for plugin marketplaces, so update manually when you want the latest skills:

```bash
codex plugin marketplace upgrade crestron-ai-skills
```

This refreshes the Crestron marketplace and the skills you installed from it. To browse or install skills, run `/plugins` in a Codex session. Start a new session after updating so the new versions load.

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
- **Registry errors** — the registry browser reads https://raw.githubusercontent.com/Crestron/CrestronAISkills/main/.claude-plugin/marketplace.json; confirm that URL loads in your browser.
- **Network access blocked** — adding the marketplace needs `github.com`, and the registry browser reads `raw.githubusercontent.com`. If your AI tool or organization blocks outside access, allow these hosts — see [Network Access](#network-access) for the steps in each tool.

---

## Network Access

Adding the marketplace reaches `github.com`; the registry browser reads `raw.githubusercontent.com`. If your tool prompts for or blocks them, allow them once:

- **Claude Code / Claude desktop (Code tab)** — in `~/.claude/settings.json`, add `"WebFetch(domain:<host>)"` for each host to `permissions.allow`, and the hosts to `sandbox.network.allowedDomains` (used for shell commands on macOS, Linux, and WSL2).
- **GitHub Copilot CLI** — choose "always allow" at the prompt, or add the hosts to `allowedUrls` in `~/.copilot/settings.json`.
- **GitHub Copilot in VS Code** — add `"https://<host>/*": true` for each host to `chat.tools.urls.autoApprove` in your `settings.json`.
- **OpenAI Codex** — in `~/.codex/config.toml`, set `network_access = true` under `[sandbox_workspace_write]`, set `enabled = true` under `[features.network_proxy]`, and add `"<host>" = "allow"` for each host under `[features.network_proxy.domains]`.
- **GitHub Copilot coding agent** — a repo or org admin adds the hosts under **Settings → Copilot → Coding agent** → custom allowlist.

On managed machines, your organization's policy may override these settings; ask your admin to allow the same two hosts.

---

## Repository Structure

```
CrestronAISkills/
├── .claude-plugin/            # Marketplace catalog (Claude Code, Claude desktop, Copilot CLI, VS Code)
├── .agents/plugins/           # Marketplace catalog (OpenAI Codex)
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md           # Skill file (Agent Skills frontmatter + instructions)
│       └── compliance.yaml    # Crestron compliance record (not shipped in plugins)
├── plugins/
│   ├── crestron-ai-skills/    # Registry-browser plugin
│   └── <skill-name>/          # One plugin per published skill
```

The web portal lives in [CrestronEng/CrestronAISkills-portal](https://github.com/CrestronEng/CrestronAISkills-portal) and reads the marketplace catalog from this repository.
---

## License

See [LICENSE](LICENSE).
