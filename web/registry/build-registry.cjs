#!/usr/bin/env node
// Builds web/dist/registry.json from the repo-root skills/ folder. Run after
// `vite build` (it writes into dist/): `npm run build:registry` from web/.
// .cjs because web/package.json is "type": "module".
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const repoRoot = path.resolve(__dirname, "..", "..");
const skillsDir = path.join(repoRoot, "skills");
const outFile = path.join(repoRoot, "web", "dist", "registry.json");

// Splits `---\n<yaml>\n---\n<body>` and parses the yaml block with a real parser
// so nested metadata (scope-allow, etc.) comes through intact.
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fm: null, malformed: "missing or unterminated frontmatter block" };
  try {
    const fm = yaml.load(match[1]);
    if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
      return { fm: null, malformed: "frontmatter did not parse to a YAML mapping" };
    }
    return { fm, malformed: null };
  } catch (e) {
    return { fm: null, malformed: `invalid YAML — ${e.message}` };
  }
}

const skills = [];

if (fs.existsSync(skillsDir)) {
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mp = path.join(skillsDir, entry.name, "skill.md");
    if (!fs.existsSync(mp)) continue;

    const { fm, malformed } = parseFrontmatter(fs.readFileSync(mp, "utf8"));
    if (malformed || !fm) {
      console.log(`Skipping ${entry.name}: ${malformed || "no frontmatter"}`);
      continue;
    }
    if (fm.deprecated === true) {
      console.log("Skipping deprecated skill:", entry.name);
      continue;
    }

    skills.push({
      name: fm.name,
      version: fm.version,
      description: fm.description,
      tags: fm.tags || [],
      author: fm.author,
      path: `skills/${entry.name}`,
      license: fm.license || "See LICENSE",
      homepage: fm.homepage || null,
      team: fm.metadata?.team || null,
      scopeAllow: fm.metadata?.["scope-allow"] || [],
      testStrategy: fm.metadata?.["test-strategy"] || null,
    });
  }
}

const registry = {
  version: "1",
  updatedAt: new Date().toISOString(),
  skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
};

fs.writeFileSync(outFile, JSON.stringify(registry, null, 2) + "\n");
console.log("Registry generated:", skills.length, "skill(s)");
