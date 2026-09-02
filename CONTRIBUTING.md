# Contributing to CrestronAISkills

Thank you for contributing! This guide explains how to add a skill to the marketplace.

---

## What Is a Skill?

A skill is a focused instruction file (`skill.md`) that shapes how an AI assistant behaves in a project. Skills in this registry work with both **GitHub Copilot** and **Claude Code**.

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
metadata:
  team: your-team-name
  maintainer: your-github-username
  dependencies: "git, GitHub API"          # or: None — never "latest" or an unpinned range
  scope-allow: ["What this skill may touch"]
  scope-deny: ["What this skill must never touch"]
  input-schema: "None, or a description of parameters/types/validation rules"
  output-schema: "Description of what the skill returns"
  output-max-size: "e.g. 10KB, or unbounded"
  idempotent: true                          # if false, also set duplicate-invocation-safeguard
  destructive-operations: ["None"]          # or list what it can delete/overwrite/force-push, etc.
  test-strategy: manual                     # manual | automated | hybrid — see Testing below
  tested-by: your-github-username           # required for manual/hybrid
  test-date: "2026-01-01"                   # required for manual/hybrid
  approved-by: approving-ai-workgroup-member
  approval-date: "2026-01-01"
---

# Your Skill Name

## Scope

**May do:** ...
**Must not do:** ...

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
| `version` | Semantic version — `major.minor.patch` (e.g. `1.0.0`). CI blocks a PR that changes a skill without increasing its version. |
| `tags` | At least one tag, lowercase (e.g. `[crestron, av, testing]`) |
| `author` | Your GitHub username |
| `license` | Optional, defaults to `MIT` |
| `compatibility` | Optional. Environment requirements (e.g. `Requires Python 3.12+, internet access`) |
| `allowed-tools` | Optional. Space-separated pre-approved tools (e.g. `Bash(git:*) Read`) |
| `homepage` | Optional URL to related repo or docs |
| `metadata` | **Required** — see full sub-field table below. Every sub-field is machine-enforced by [`skill-schema.json`](skill-schema.json). |

**Required `metadata` sub-fields** (all enforced by CI, not just human review):

| Field | Rules |
|---|---|
| `team` / `maintainer` | Owning team and a designated maintainer GitHub username. |
| `dependencies` | Comma-separated tools/APIs invoked, with pinned versions. `None` if there are none. No floating `latest` or unpinned ranges (`^`, `~`, `>=`). |
| `scope-allow` / `scope-deny` | Arrays declaring exactly what systems/files/APIs the skill may and may not touch. Requires a matching `## Scope` section in the body. |
| `input-schema` / `output-schema` / `output-max-size` | Free-text description of the input contract, output shape, and a declared maximum output size. Use `"None"` where genuinely not applicable. |
| `idempotent` | `true`/`false`. If `false`, also set `duplicate-invocation-safeguard` describing how duplicate invocations are made safe. |
| `destructive-operations` | Array of destructive operations the skill (or its bundled scripts) can perform, or `["None"]`. Must match what the automated security scan finds in any bundled scripts — see [Security Scanning](#security-scanning-of-bundled-scripts). |
| `test-strategy` | `manual`, `automated`, or `hybrid` — see [Testing Requirements (C3)](#testing-requirements-c3). A skill bundling executable scripts cannot use `manual`. |
| `tested-by` / `test-date` | Required for `manual`/`hybrid`. Who ran the eval and when. |
| `test-coverage` | Required for `automated`/`hybrid`. The measured line-coverage percentage from the test matrix. |
| `approved-by` / `approval-date` | GitHub username of the approving AI Workgroup member and the approval date. |
| `deprecation-notice-date` / `removal-date` | Required once `deprecated: true` is set. `removal-date` must be ≥ 60 days after `deprecation-notice-date`. |

All frontmatter fields are validated against [`skill-schema.json`](skill-schema.json) at the repository root — this is the single source of truth; `.github/scripts/validate-skill.js` loads it directly (via `ajv`) rather than re-implementing its own rules. You can validate locally before submitting:

```bash
npm install
CHANGED_DIRS="skills/your-skill-name" node .github/scripts/validate-skill.js
CHANGED_DIRS="skills/your-skill-name" node .github/scripts/scan-skill-security.js
CHANGED_DIRS="skills/your-skill-name" node .github/scripts/run-skill-tests.js
```

### Keeping `copilot-skills/` in sync

Every skill under `skills/<name>/skill.md` needs an identical mirror at
`copilot-skills/<name>/SKILL.md` (uppercase filename) so Copilot CLI/VS Code users
see it too. CI fails the PR if the two copies drift — after editing `skills/<name>/skill.md`,
copy it over the mirror:

```bash
cp skills/your-skill-name/skill.md copilot-skills/your-skill-name/SKILL.md
```

### Security scanning of bundled scripts

If your skill bundles executable scripts (`.ps1`/`.sh`/`.py`/`.js`),
`.github/scripts/scan-skill-security.js` runs on every PR and:
- Flags a fixed list of dangerous patterns (force deletion, `Invoke-Expression`/`eval`,
  `shell=True`, curl-pipe-to-shell, force-push, destructive SQL, etc.) that aren't
  declared in `metadata.destructive-operations` — declare them or remove the pattern.
- Flags prompt-injection smuggling signals in the `skill.md` **body itself** (zero-width
  Unicode, `<script>` tags, imperative override language inside HTML comments, long
  base64-looking blobs) — a skill file is loaded verbatim into other agents' context, so
  this is a direct mitigation for OWASP LLM01.
- Flags **self-modification** as a blocking error, always — this is never coverable by a
  `metadata.destructive-operations` declaration: a script that references its own path
  (`$PSCommandPath`, `__file__`, `$0`/`BASH_SOURCE`, `__filename`/`import.meta.url`)
  alongside a write operation, or any script/`skill.md` content that writes to a
  governance file (`skill-schema.json`, the validator/scanner/registry scripts,
  workflow files, `CODEOWNERS`). A skill must never be able to modify the checks that
  validate it.
- Flags general **mutating commands** as a non-blocking warning — file writes, mutating
  HTTP verbs (POST/PUT/PATCH/DELETE), `git commit`/`add`/`push`, env/registry changes,
  package installs. Lower severity than the destructive-op list and not
  declaration-gated (too common to require declaring every file write); surfaced for
  human review at merge time.
- A separate step (TruffleHog, `--only-verified`) scans the PR diff for live, verifiable
  secrets. Never commit API keys, tokens, or credentials in a skill or its scripts.

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

Open a PR against `main`. Three workflows run automatically:

**`validate-skill.yml`** (schema + structure + secrets):
- ✅ Checks that `skill.md` exists and its frontmatter is well-formed (exactly one closing `---`)
- ✅ Validates all frontmatter fields, including the full `metadata` block, against [`skill-schema.json`](skill-schema.json)
- ✅ Verifies the directory name matches `name`, and that `copilot-skills/<name>/SKILL.md` mirrors it
- ✅ Verifies `version` increased and `dependencies` has no floating `latest`/unpinned range
- ✅ Runs `scan-skill-security.js` (dangerous ops, prompt-injection signals) and a TruffleHog secrets scan
- ✅ Rebuilds `registry.json` from all skills on merge

**`test-skill.yml`** (C3 test coverage):
- ✅ For `automated`/`hybrid` skills, runs the matching test runner per bundled script language and enforces ≥90% coverage (see [Testing Requirements](#testing-requirements-c3))
- ✅ For `manual`/`hybrid` skills, checks a non-empty `tests/evals.md` exists

**Required review:** `CODEOWNERS` requires an approving review from `@crestron/ai-workgroup`
on any change under `skills/**` or `copilot-skills/**` — this is what actually enforces
the C1 "approving AI Workgroup member recorded" item; the `metadata.approved-by` field
records *who*, the required review enforces *that someone from the right team looked*.

Fix any errors the CI reports before requesting review. A reviewer from the AI Workgroup
then completes the [C1–C6 approval checklist](#skill-approval-checklist) before merging
— most items are now machine-checked; only genuine judgment calls (does behavior really
match the declared scope? is the description accurately single-purpose?) are left to
human review.

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

## Deprecating a Skill

If a skill is no longer recommended but should be kept for reference, set `deprecated: true` in its frontmatter:

```yaml
---
name: your-skill-name
version: 2.0.0
deprecated: true
description: ...
---
```

The skill files remain in `skills/` (browsable in the repo) but are excluded from `registry.json` and will not appear in the marketplace. CI validation is also skipped for deprecated skills.

Open a PR with the frontmatter change. No other steps are required.

## Removing a Skill

Delete the `skills/<skill-name>/` directory and open a PR. The registry and marketplace update automatically on merge.

---

## Importing a Skill You Built in Another Repo

Most teams build a skill in their own repo first and transfer it here once it's
ready. `sync-skill.yml` mirrors it into `skills/<name>/` and opens a normal PR
— it never pushes to `main` directly, and the resulting PR goes through the
exact same `validate-skill.yml`/`test-skill.yml`/CODEOWNERS pipeline as a
hand-written skill.

### Running the sync

From the **Actions** tab, run **Sync Skill From Source Repo**
(`workflow_dispatch`) with:

| Input | Meaning |
|---|---|
| `source_repo` | The team's repo, as `owner/repo` |
| `source_ref` | Branch, tag, or commit SHA to sync from |
| `source_path` | Path within their repo to the skill's directory |
| `target_name` | Optional — skill name here (`skills/<target_name>/`). Defaults to the last segment of `source_path`. |

This requires the `SKILL_SYNC_SOURCE_TOKEN` repo secret (a read-only,
fine-grained PAT scoped to the relevant org repos) to already exist — ask an
org admin if the run fails with a checkout/auth error on the source repo.

### What happens

- Every skill/file under `source_path` is copied into `skills/<target_name>/`
  and mirrored to `copilot-skills/<target_name>/SKILL.md`.
- `metadata.source-repo`, `source-ref`, `source-path`, and `synced-at` are
  stamped from the sync inputs — always overwritten on every run.
- **On a fresh import**, the Crestron-only compliance fields (`scope-allow`,
  `test-strategy`, `approved-by`, etc.) are *not* scaffolded — they're simply
  absent, and `validate-skill.js` will list them as missing on the PR, same as
  any other new skill. Fill them in directly on the sync PR branch before
  requesting review.
- **On a re-sync**, any compliance fields already filled in from a previous
  approval are preserved — only the content (name/description/version/tags/
  author/body) and the `source-*`/`synced-at` fields update.
- The workflow reuses one branch per skill (`sync/<target_name>`) and pushes
  updates to the same open PR rather than opening duplicates.

### The lock policy

Once a skill has `metadata.source-repo` set, editing it from any branch other
than `sync/<target_name>` triggers a warning from `validate-skill.js`: *"this
skill is synced from `<repo>` — edits made directly here will be overwritten
by the next sync."* This isn't a hard block — a deliberate, reviewed emergency
patch is still possible — but the expectation is that changes belong in the
source repo, and the next sync will otherwise silently overwrite a direct edit
here.

### Requesting a re-sync

Re-run the same workflow with an updated `source_ref` whenever the team ships
a new version. There is currently no automatic trigger for this — see
[`docs/runbooks/skill-sync-webhook.md`](docs/runbooks/skill-sync-webhook.md)
for the deferred webhook design if manual re-syncing becomes a frequent chore.

---

## Testing Requirements (C3)

Every skill declares `metadata.test-strategy: manual | automated | hybrid`.

**`manual`** — only valid when the skill bundles no executable scripts (pure
instruction/persona skills like `hello-world`). Record a `tests/evals.md` file
listing the prompts/scenarios you ran against the skill and their pass/fail outcome,
and set `metadata.tested-by`/`test-date`.

**`automated`** or **`hybrid`** — required for any skill that bundles `.ps1`/`.py`/`.sh`/`.js`
scripts. `hybrid` also requires `tests/evals.md` for the non-script parts of the skill.
Every bundled script needs a matching test file and passes through the matrix below:

| Script extension | Test runner | Test file location | Coverage gate |
|---|---|---|---|
| `.ps1` | Pester 5+ | `tests/<name>.Tests.ps1` | ≥90% line coverage (`Invoke-Pester -CodeCoverage`) |
| `.py` | pytest + pytest-cov | `tests/test_<name>.py` | ≥90% line coverage |
| `.sh` | bats-core | `tests/<name>.bats` | **No numeric coverage** — bats has no viable line-coverage tool in a CI container (`kcov` is Linux-only/ptrace-based and brittle). Substituted with: 100% of declared bats test cases must pass. |
| `.js` | vitest | `tests/<name>.test.js` | ≥90% line coverage |

Regardless of language, cover at minimum: the happy path, boundary cases (empty
input, max-length input, invalid types), and **at least one injection/path-traversal
test** — feed the script a path-traversal payload (`../../etc`, `..\..\Windows`) and a
shell-metacharacter payload, and assert it rejects/errors rather than executing it.
This is checked for *presence*, not folded into the coverage percentage.

Run the full matrix locally before opening a PR:

```bash
CHANGED_DIRS="skills/your-skill-name" node .github/scripts/run-skill-tests.js
```

---

## Skill Approval Checklist

Complete before a registry entry is approved. Re-complete for any **MAJOR** or **MINOR** version change. Most items below are now machine-enforced by `validate-skill.yml`/`test-skill.yml`; the "Result" column is still filled in by the reviewer as a final confirmation, and is the only record for the handful of items (marked *human judgment*) that CI cannot verify.

---

**Skill name:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Version:** \_\_\_\_\_\_\_\_&nbsp;&nbsp; **Owner team:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Registry PR:** \_\_\_\_\_\_\_\_

---

### C1 — Registry Entry Requirements

> **Schema enforcement**: every item below except "Approval status... recorded" (which
> also requires the `@crestron/ai-workgroup` CODEOWNERS review, not just the field) is
> machine-validated by [`skill-schema.json`](skill-schema.json) in CI.

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

> **Schema/scan enforcement**: everything below is machine-checked except "single
> responsibility" (a `warning` when the description repeats "and" 3+ times — always
> *human judgment*) and "outputs sanitized/structured" (the prompt-injection body scan
> catches smuggled content, but judging whether prose output is well-structured stays
> a human call).

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Skill performs one well-defined task — single responsibility satisfied *(human judgment)* | 6.2.1 | P / F / N-A |
| ☐ | Scope boundaries explicitly declared including which systems/files/APIs the skill may access | 6.2.2 | P / F / N-A |
| ☐ | Maximum scope of any write or destructive operation documented | 6.2.2 | P / F / N-A |
| ☐ | Conditions under which skill must abort and return error (not proceed) are defined | 6.2.2 | P / F / N-A |
| ☐ | Idempotency documented; if not idempotent, duplicate invocation safeguards documented | 6.2.2 | P / F / N-A |
| ☐ | All parameters type-checked and range-validated before use (input validation implemented) | 6.2.3 | P / F / N-A |
| ☐ | String parameters used in file paths, commands, or API calls sanitized against injection | 6.2.3 | P / F / N-A |
| ☐ | Skill rejects out-of-schema inputs with structured error — does not silently discard | 6.2.3 | P / F / N-A |
| ☐ | Outputs stripped or escaped of content that could function as instructions in agent context | 6.2.4 | P / F / N-A |
| ☐ | Output truncated to declared maximum length before returning to agent | 6.2.4 | P / F / N-A |
| ☐ | Output returns structured data (JSON/typed) rather than freeform text where possible *(human judgment)* | 6.2.4 | P / F / N-A |

### C3 — Test Coverage Requirements

> See [Testing Requirements (C3)](#testing-requirements-c3) above for the full
> per-language matrix `test-skill.yml` enforces.

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Unit tests present: all input validation paths, happy path, and error paths — 90%+ line coverage | 6.4 | P / F / N-A |
| ☐ | Boundary tests present: empty input, max-length input, invalid types — all declared constraints | 6.4 | P / F / N-A |
| ☐ | Injection tests present: prompt injection payloads in string params, path traversal in file paths | 6.4 | P / F / N-A |
| ☐ | Idempotency tests present for all write operations (duplicate invocation with identical inputs) | 6.4 | P / F / N-A |
| ☐ | Scope boundary tests present: attempts to access resources outside declared scope return errors | 6.4 | P / F / N-A |

### C4 — Versioning & Runtime Controls

> **Runtime logging/confirmation caveat**: the last two items are properties of the
> *agent runtime* consuming a skill, not of the skill file. CI can only verify the
> skill's own instructions declare the destructive action and tell the agent to
> confirm before proceeding — it cannot verify any given runtime actually enforces
> invocation logging or a confirmation prompt. Mark these `N-A` if your skill has no
> runtime component beyond the markdown instructions.

| ✓ | Checklist Item | Policy § | Result |
|---|---|---|---|
| ☐ | Semantic versioning used; breaking interface/behavior change increments MAJOR version | 6.3 | P / F / N-A |
| ☐ | Agents declare explicit version dependencies — no floating references to 'latest' | 6.3 | P / F / N-A |
| ☐ | Deprecation notice issued at least 60 days before removal if replacing existing version | 6.3 | P / F / N-A |
| ☐ | Skill invocations logged with invoking agent ID, skill name/version, input hash, outcome *(runtime, not CI-verifiable)* | 6.5 | P / F / N-A |
| ☐ | Destructive operations emit pre-execution summary requiring orchestration confirmation *(runtime, not CI-verifiable)* | 6.5 | P / F / N-A |

### C5 — Approval Rules / C6 — Automatic Rejection Conditions

A PR is auto-rejected (CI fails) if: `skill.md` or its `metadata` block is missing
required fields; the directory name doesn't match `name`; `copilot-skills/` has
drifted; `version` didn't increase; a dangerous script pattern isn't declared in
`destructive-operations`; a bundled script has no matching test file or falls below
90% coverage; a `manual`/`hybrid` skill has no `tests/evals.md`; or TruffleHog finds a
verified secret in the diff. A weekly scheduled run of the same checks
(`validate-skill-full.yml`) re-validates **every** skill, not just changed ones, so
drift in untouched skills doesn't go unnoticed indefinitely.

Approval additionally requires the `@crestron/ai-workgroup` CODEOWNERS review and the
`metadata.approved-by`/`approval-date` fields — CI can confirm the fields are present,
but only the required review confirms a real person actually looked.

---

**Reviewer (Skill Registry):** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Date:** \_\_\_\_\_\_\_\_\_\_\_\_&nbsp;&nbsp; **Result:** Pass ☐ &nbsp; Fail ☐ &nbsp; Waiver ☐

---

## Questions?

Open a [GitHub Discussion](https://github.com/Crestron/CrestronAISkills/discussions) or file an [issue](https://github.com/Crestron/CrestronAISkills/issues).
