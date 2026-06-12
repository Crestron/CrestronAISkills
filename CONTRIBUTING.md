# Contributing to CrestronAISkills

Thank you for contributing! This guide explains how to add a skill to the marketplace.

---

## What Is a Skill?

A skill is a focused instruction file (`skill.md`) that shapes how an AI assistant behaves in a project. Skills in this registry work with both **GitHub Copilot** and **Claude Code**.

---

## Adding a New Skill

### 1. Fork and Clone

```bash
git clone https://github.com/Crestron/CrestronAISkills
cd CrestronAISkills
```

### 2. Create a Branch

```bash
git checkout -b add-your-skill-name
```

### 3. Create the Skill Directory and File

The directory name **must exactly match** the `name` field in the frontmatter.

```
skills/
└── your-skill-name/        ← kebab-case, lowercase
    └── skill.md             ← required
```

### 4. Write `skill.md`

The file has two parts: a YAML frontmatter block and a markdown body.

```markdown
---
name: your-skill-name
version: 1.0.0
description: One or two sentences describing what your skill does (10–200 characters)
tags: [tag1, tag2]
author: your-github-username
license: MIT
homepage: https://github.com/your-org/your-repo
---

# Your Skill Name

## Role & Purpose
Describe the role the AI takes when this skill is active.

## Behavior Guidelines
- When asked about X, always...
- Prefer Y over Z when...
```

**Required frontmatter fields:**

| Field | Rules |
|---|---|
| `name` | Must match the directory name exactly. Lowercase letters, numbers, hyphens. No leading, trailing, or consecutive hyphens. Max 64 chars. |
| `description` | 10–1024 characters. Describe what the skill does **and when to use it** — agents use this for discovery. |
| `version` | Semantic version — `major.minor.patch` (e.g. `1.0.0`) |
| `tags` | At least one tag, lowercase (e.g. `[crestron, av, testing]`) |
| `author` | Your GitHub username |
| `license` | Optional, defaults to `MIT` |
| `compatibility` | Optional. Environment requirements (e.g. `Requires Python 3.12+, internet access`) |
| `allowed-tools` | Optional. Space-separated pre-approved tools (e.g. `Bash(git:*) Read`) |
| `homepage` | Optional URL to related repo or docs |
| `metadata` | Optional key-value block for `team`, `maintainer`, `dependencies` (required for C1 approval) |

All frontmatter fields are validated against [`skill-schema.json`](skill-schema.json) at the repository root. You can validate locally before submitting:

```bash
# Install the agentskills validator (optional)
npx skills-ref validate ./skills/your-skill-name
```

The `metadata` block is where you record C1 checklist fields:

```yaml
metadata:
  team: your-team-name
  maintainer: your-github-username
  dependencies: "git, GitHub API"
```

### 5. Test the Skill Locally

Before submitting, verify the skill works as expected.

**GitHub Copilot:**
```bash
mkdir -p /path/to/test-project/.github/skills/your-skill-name
cp skills/your-skill-name/skill.md /path/to/test-project/.github/skills/your-skill-name/skill.md
```
Open the test project in VS Code with GitHub Copilot — the skill is picked up automatically.

**Claude Code:**
```bash
mkdir -p /path/to/test-project/.claude/commands
# Strip the YAML frontmatter, keep only the instruction body
awk '/^---$/{n++; next} n>=2{print}' skills/your-skill-name/skill.md \
  > /path/to/test-project/.claude/commands/your-skill-name.md
```
Open the test project in Claude Code and run `/your-skill-name` to activate it.

---

## Submitting Your Skill

### 1. Commit and Push

```bash
git add skills/your-skill-name/
git commit -m "feat: add your-skill-name skill"
git push origin add-your-skill-name
```

### 2. Open a Pull Request

Open a PR against `main`. The CI will automatically:
- ✅ Check that `skill.md` exists in the directory
- ✅ Validate required frontmatter fields (`name`, `version`, `description`, `tags`, `author`) against [`skill-schema.json`](skill-schema.json)
- ✅ Verify the directory name matches the `name` field
- ✅ Rebuild `registry.json` from all skills on merge

Fix any errors the CI reports before requesting review. A maintainer then completes the [C1–C4 approval checklist](#skill-approval-checklist) before merging.

### 3. Review and Merge

A maintainer will review your skill. Once approved and merged:
- `registry.json` is automatically rebuilt from all skills
- The marketplace site is automatically redeployed
- Your skill appears at **https://crestron.github.io/CrestronAISkills/** within a few minutes

---

## Updating an Existing Skill

1. Make your changes to `skills/<skill-name>/skill.md`
2. Bump the `version` field in the frontmatter following [semver](https://semver.org/):
   - `patch` (1.0.x) — minor instruction tweaks
   - `minor` (1.x.0) — new behaviors, backward compatible
   - `major` (x.0.0) — breaking changes to the skill's scope
3. Open a PR — the same CI validation runs

---

## Removing a Skill

Delete the `skills/<skill-name>/` directory and open a PR. The registry and marketplace update automatically on merge.

---

## Skill Guidelines

- **Name**: Use kebab-case (e.g. `crestron-helper`, not `CrestronHelper`)
- **Description**: Be specific and concise — this appears in the marketplace card
- **Tags**: Use lowercase, relevant tags to aid discoverability
- **Instructions**: Write clear, focused instructions in the markdown body
- **No secrets**: Never include API keys, tokens, or passwords in a skill
- **License**: Skills must use an open-source license

> **Open Standard**: All skills in this registry must conform to the [agentskills.io](https://agentskills.io) open standard by Anthropic. Review the standard before submitting.

---

## Skill Approval Checklist

Complete before a registry entry is approved. Re-complete for any **MAJOR** or **MINOR** version change.

---

**Skill name:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Version:** \_\_\_\_\_\_\_\_&nbsp;&nbsp; **Owner team:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Registry PR:** \_\_\_\_\_\_\_\_

---

### C1 — Registry Entry Requirements

> **Schema enforcement**: The `name`, `version`, `description`, `tags`, and `author` fields are machine-validated by [`skill-schema.json`](skill-schema.json) in CI. The remaining C1 items below require human review.

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Skill name, description, and semantic version recorded in registry entry | 6.1 | P / F / N-A |
| ☐ | Owner team and designated maintainer identified | 6.1 | P / F / N-A |
| ☐ | All tool and API dependencies the skill invokes are listed | 6.1 | P / F / N-A |
| ☐ | Input schema documented with all parameter types and validation rules | 6.1 | P / F / N-A |
| ☐ | Output schema documented including maximum output size | 6.1 | P / F / N-A |
| ☐ | Scope constraints declared: what skill can and cannot do | 6.1 | P / F / N-A |
| ☐ | Test coverage percentage documented and meets minimum thresholds (see C3) | 6.1 | P / F / N-A |
| ☐ | Approval status and approving AI Workgroup member recorded | 6.1 | P / F / N-A |

### C2 — Design Requirements

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Skill performs one well-defined task — single responsibility satisfied | 6.2.1 | P / F / N-A |
| ☐ | Scope boundaries explicitly declared including which systems/files/APIs the skill may access | 6.2.2 | P / F / N-A |
| ☐ | Maximum scope of any write or destructive operation documented | 6.2.2 | P / F / N-A |
| ☐ | Conditions under which skill must abort and return error (not proceed) are defined | 6.2.2 | P / F / N-A |
| ☐ | Idempotency documented; if not idempotent, duplicate invocation safeguards documented | 6.2.2 | P / F / N-A |
| ☐ | All parameters type-checked and range-validated before use (input validation implemented) | 6.2.3 | P / F / N-A |
| ☐ | String parameters used in file paths, commands, or API calls sanitized against injection | 6.2.3 | P / F / N-A |
| ☐ | Skill rejects out-of-schema inputs with structured error — does not silently discard | 6.2.3 | P / F / N-A |
| ☐ | Outputs stripped or escaped of content that could function as instructions in agent context | 6.2.4 | P / F / N-A |
| ☐ | Output truncated to declared maximum length before returning to agent | 6.2.4 | P / F / N-A |
| ☐ | Output returns structured data (JSON/typed) rather than freeform text where possible | 6.2.4 | P / F / N-A |

### C3 — Test Coverage Requirements

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Unit tests present: all input validation paths, happy path, and error paths — 90%+ line coverage | 6.4 | P / F / N-A |
| ☐ | Boundary tests present: empty input, max-length input, invalid types — all declared constraints | 6.4 | P / F / N-A |
| ☐ | Injection tests present: prompt injection payloads in string params, path traversal in file paths | 6.4 | P / F / N-A |
| ☐ | Idempotency tests present for all write operations (duplicate invocation with identical inputs) | 6.4 | P / F / N-A |
| ☐ | Scope boundary tests present: attempts to access resources outside declared scope return errors | 6.4 | P / F / N-A |

### C4 — Versioning & Runtime Controls

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Semantic versioning used; breaking interface/behavior change increments MAJOR version | 6.3 | P / F / N-A |
| ☐ | Agents declare explicit version dependencies — no floating references to 'latest' | 6.3 | P / F / N-A |
| ☐ | Deprecation notice issued at least 60 days before removal if replacing existing version | 6.3 | P / F / N-A |
| ☐ | Skill invocations logged with invoking agent ID, skill name/version, input hash, outcome | 6.5 | P / F / N-A |
| ☐ | Destructive operations emit pre-execution summary requiring orchestration confirmation | 6.5 | P / F / N-A |

---

**Reviewer (Skill Registry):** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Date:** \_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Result:** Pass ☐ &nbsp; Fail ☐ &nbsp; Waiver ☐

---

## Questions?

Open a [GitHub Discussion](https://github.com/Crestron/CrestronAISkills/discussions) or file an [issue](https://github.com/Crestron/CrestronAISkills/issues).
