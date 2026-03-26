# Contributing to CrestronAISkills

Thank you for contributing! This guide explains how to create and submit a skill to the marketplace.

---

## What Is a Skill?

A skill is a **GitHub Copilot CLI extension** — a Node.js `.mjs` file that registers custom tools, hooks, and behaviors into Copilot CLI sessions. Skills in this registry must:

- Have a valid `skill.json` manifest
- Include an `extension.mjs` entry point
- Include a `README.md` documentation file
- Pass automated CI validation

---

## Creating a Skill

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/CrestronAISkills
cd CrestronAISkills
```

### 2. Create Your Skill Directory

```
skills/
└── your-skill-name/        ← kebab-case, lowercase
    ├── skill.json           ← required manifest
    ├── extension.mjs        ← required entry point
    └── README.md            ← required documentation
```

### 3. Write `skill.json`

```json
{
  "name": "your-skill-name",
  "version": "1.0.0",
  "description": "What your skill does (10–200 characters)",
  "tags": ["tag1", "tag2"],
  "author": "your-github-username",
  "entry": "extension.mjs",
  "license": "MIT",
  "homepage": "https://github.com/YOUR-USERNAME/your-repo"
}
```

> Validate against [skill-schema.json](../skill-schema.json) before submitting.

### 4. Write `extension.mjs`

Every skill is a Copilot CLI extension. Use `@github/copilot-sdk/extension`:

```js
import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
    tools: [
        {
            name: "my_tool",
            description: "Describe what this tool does so Copilot knows when to use it.",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string", description: "The input" },
                },
                required: ["input"],
            },
            handler: async (args) => {
                return `Result: ${args.input}`;
            },
        },
    ],
});
```

See the [example skill](../skills/example-skill/) and [Copilot CLI extension docs](https://docs.github.com/copilot) for more patterns.

### 5. Write `README.md`

Include:
- What the skill does
- List of tools it provides with parameters
- Installation instructions
- Usage examples

### 6. Test Locally

Copy your skill to `~/.copilot/extensions/<your-skill-name>/` and restart Copilot CLI to test it.

---

## Submitting Your Skill

### 1. Create a Branch

```bash
git checkout -b add-your-skill-name
```

### 2. Add Your Files

```bash
git add skills/your-skill-name/
git commit -m "feat: add your-skill-name skill"
```

### 3. Open a Pull Request

Push your branch and open a PR against `main`. The CI will:
- ✅ Validate `skill.json` against the schema
- ✅ Check required files exist (`skill.json`, `extension.mjs`, `README.md`)
- ✅ Check for naming conflicts in the registry

### 4. Review & Merge

A maintainer will review your skill. Once approved and merged, the registry is automatically updated and your skill appears in the marketplace.

---

## Skill Guidelines

- **Name**: Use kebab-case (e.g., `crestron-helper`, not `CrestronHelper`)
- **Description**: Be specific about what the skill does
- **Tags**: Use lowercase, relevant tags to aid discoverability
- **No secrets**: Never include API keys, tokens, or passwords
- **Open source**: Skills must use an open-source license

---

## Updating a Skill

Update the `version` field in `skill.json` and open a PR with your changes. Follow [semver](https://semver.org/):
- `patch` (1.0.x) — bug fixes
- `minor` (1.x.0) — new features, backward compatible
- `major` (x.0.0) — breaking changes

---

## Questions?

Open a [GitHub Discussion](https://github.com/CrestronAISkills/CrestronAISkills/discussions) or file an [issue](https://github.com/CrestronAISkills/CrestronAISkills/issues).
