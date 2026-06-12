# Contributing to CrestronAISkills

Thank you for contributing! This guide explains how to create and submit a skill to the marketplace.

---

## What Is a Skill?

A skill is a **GitHub Copilot instruction file** — a single `skill.md` file with YAML frontmatter that defines metadata and a body containing instructions for Copilot. Skills in this registry must:

- Have a valid `skill.md` with required frontmatter fields
- Pass automated CI validation

---

## Creating a Skill

### 1. Fork & Clone

```bash
git clone https://github.com/Crestron/CrestronAISkills
cd CrestronAISkills
```

### 2. Create Your Skill Directory

```
skills/
└── your-skill-name/        ← kebab-case, lowercase
    └── skill.md             ← required (frontmatter + instructions)
```

### 3. Write `skill.md`

```markdown
---
name: your-skill-name
version: 1.0.0
description: What your skill does (10–200 characters)
tags: [tag1, tag2]
author: your-github-username
license: MIT
homepage: https://github.com/your-org/your-repo
---

# Your Skill Name

## Role & Purpose
Describe the role Copilot takes when this skill is active...

## Behavior Guidelines
- When asked about X, always...
- Prefer Y over Z when...
```

> Validate frontmatter against [skill-schema.json](../skill-schema.json) before submitting.

### 4. Test Locally

Copy `skill.md` to `~/.copilot/instructions/<your-skill-name>.md` and use it in a Copilot session to verify the instructions work as expected.

---

## Submitting Your Skill

### 1. Create a Branch

```bash
git checkout -b add-your-skill-name
```

### 2. Add Your File

```bash
git add skills/your-skill-name/
git commit -m "feat: add your-skill-name skill"
```

### 3. Open a Pull Request

Push your branch and open a PR against `main`. The CI will:
- ✅ Validate `skill.md` frontmatter fields (name, version, description, tags, author)
- ✅ Check naming conflicts in the registry

### 4. Review & Merge

A maintainer will review your skill. Once approved and merged, the registry is automatically updated and your skill appears in the marketplace.

---

## Skill Guidelines

- **Name**: Use kebab-case (e.g., `crestron-helper`, not `CrestronHelper`)
- **Description**: Be specific about what the skill does (10–200 characters)
- **Tags**: Use lowercase, relevant tags to aid discoverability
- **Instructions**: Write clear, focused Copilot instructions in the markdown body
- **No secrets**: Never include API keys, tokens, or passwords
- **Open source**: Skills must use an open-source license

---

## Updating a Skill

Update the `version` field in the frontmatter of `skill.md` and open a PR with your changes. Follow [semver](https://semver.org/):
- `patch` (1.0.x) — minor instruction tweaks
- `minor` (1.x.0) — new behaviors, backward compatible
- `major` (x.0.0) — breaking changes to the skill's scope

---

## Questions?

Open a [GitHub Discussion](https://github.com/Crestron/CrestronAISkills/discussions) or file an [issue](https://github.com/Crestron/CrestronAISkills/issues).
