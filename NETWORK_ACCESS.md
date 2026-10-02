# Network access for the CrestronAISkills registry

The Crestron AI Skills plugin, registry-browser skill, and Copilot CLI extension fetch from a few hosts:

- `github.com`
- `api.github.com`
- `raw.githubusercontent.com`
- `crestron.github.io` (GitHub Pages build of `registry.json`)

Each agent tool controls network egress differently. Claude Code, Codex CLI,
Copilot CLI, and VS Code read from settings files; GitHub Copilot coding agent
does not, so its allowlist has to be set by a repo or org admin in the GitHub UI.

## Claude Code

**Working inside this repo:** no action needed. `.claude/settings.json` is
committed at the repo root and grants the four hosts above automatically the
first time you open the repo in Claude Code.

**Using the plugin in your own projects:** the repo's settings file doesn't
apply there. If Claude Code prompts for or blocks these hosts, add them to your
user settings at `~/.claude/settings.json` (merge into any existing
`permissions` / `sandbox` keys):

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:github.com)",
      "WebFetch(domain:api.github.com)",
      "WebFetch(domain:raw.githubusercontent.com)",
      "WebFetch(domain:crestron.github.io)"
    ]
  },
  "sandbox": {
    "network": {
      "allowedDomains": [
        "github.com",
        "api.github.com",
        "raw.githubusercontent.com",
        "crestron.github.io"
      ]
    }
  }
}
```

The Claude desktop app's Code tab reads the same file. The `WebFetch` rules
control the fetch tool; `sandbox.network.allowedDomains` applies to shell
commands such as `curl` and only takes effect where the sandbox runs (macOS,
Linux, WSL2 — not native Windows).

## GitHub Copilot CLI

Copilot CLI asks for approval the first time it fetches each URL. To allow the
hosts up front, pass them when starting a session:

```bash
copilot --allow-url=github.com --allow-url=api.github.com --allow-url=raw.githubusercontent.com --allow-url=crestron.github.io
```

Or allow them permanently in `~/.copilot/settings.json` (choosing "always
allow" at the prompt adds them here too):

```json
{
  "allowedUrls": [
    "github.com",
    "api.github.com",
    "raw.githubusercontent.com",
    "crestron.github.io"
  ]
}
```

`deniedUrls` entries take precedence over `allowedUrls`.

## GitHub Copilot in VS Code

Agent mode asks before fetching a URL and again before using the fetched
content. To approve these hosts automatically, add to your VS Code
`settings.json`:

```json
"chat.tools.urls.autoApprove": {
  "https://github.com/*": true,
  "https://api.github.com/*": true,
  "https://raw.githubusercontent.com/*": true,
  "https://crestron.github.io/*": true
}
```

If you're on a sandboxed Enterprise setup where org policy overrides repo
settings, ask your Claude admin to add the same four hosts under
Organization settings → Capabilities → Code execution → Allow network egress
→ Additional allowed domains.

## Codex CLI

Codex config is per-user, not repo-committed, so each person needs to add this
to their own `~/.codex/config.toml`:

```toml
[sandbox_workspace_write]
network_access = true

[features.network_proxy]
enabled = true

[features.network_proxy.domains]
"github.com" = "allow"
"api.github.com" = "allow"
"raw.githubusercontent.com" = "allow"
"crestron.github.io" = "allow"
```

A ready-to-copy copy of this lives in `codex-config-snippet.toml` at the repo
root:

```bash
cat codex-config-snippet.toml >> ~/.codex/config.toml
```

If you already have a `[sandbox_workspace_write]` or `[features.network_proxy]`
section, merge the keys in rather than duplicating the header (TOML doesn't
allow the same table twice).

On a managed machine, your org may lock parts of this down via
`requirements.toml` — if network access still doesn't work after adding this,
check with whoever administers Codex for your team.

## GitHub Copilot coding agent

Copilot has no repo-committed config for this; it's a setting a repo or org
admin sets in the GitHub UI:

1. On GitHub, go to the repo's **Settings**.
2. In the sidebar, under **Code & automation**, click **Copilot** → **Coding agent**.
3. Under the firewall / custom allowlist section, add:
   - `github.com`
   - `api.github.com`
   - `raw.githubusercontent.com`
   - `crestron.github.io`
4. Leave the recommended allowlist on unless you have a reason to turn it off —
   it's additive, not a replacement for your custom entries.

If your organization manages this centrally instead, the same steps exist at
the organization level under **Settings → Copilot → Cloud agent → Internet
access**, and org owners can decide whether repos are allowed to add their own
custom entries at all.
