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

// Agent Skills layout only: SKILL.md (spec frontmatter; version/author/tags are strings under
// metadata, tags comma-separated) plus compliance.yaml (Crestron compliance record, incl. deprecated).
const splitTags = (t) => (typeof t === "string" ? t.split(",") : []).map((x) => x.trim()).filter(Boolean);

function readCompliance(dir) {
  const file = path.join(dir, "compliance.yaml");
  if (!fs.existsSync(file)) return null;
  try {
    const data = yaml.load(fs.readFileSync(file, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch (e) {
    console.log(`Unreadable ${file}: ${e.message}`);
    return null;
  }
}

if (fs.existsSync(skillsDir)) {
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(skillsDir, entry.name);
    // Exact name: the Pages build runs on a case-sensitive filesystem.
    if (!fs.readdirSync(dir).includes("SKILL.md")) {
      console.log(`Skipping ${entry.name}: no SKILL.md`);
      continue;
    }

    const { fm, malformed } = parseFrontmatter(fs.readFileSync(path.join(dir, "SKILL.md"), "utf8"));
    if (malformed || !fm) {
      console.log(`Skipping ${entry.name}: ${malformed || "no frontmatter"}`);
      continue;
    }
    const compliance = readCompliance(dir);
    if (!compliance) {
      console.log(`Skipping ${entry.name}: no valid compliance.yaml`);
      continue;
    }
    if (compliance.deprecated === true) {
      console.log("Skipping deprecated skill:", entry.name);
      continue;
    }

    const meta = fm.metadata && typeof fm.metadata === "object" ? fm.metadata : {};
    skills.push({
      name: fm.name,
      version: meta.version,
      description: fm.description,
      tags: splitTags(meta.tags),
      author: meta.author,
      path: `skills/${entry.name}`,
      license: fm.license || "See LICENSE",
      homepage: meta.homepage || null,
      team: compliance.team || null,
      scopeAllow: Array.isArray(compliance["scope-allow"]) ? compliance["scope-allow"] : [],
      testStrategy: compliance["test-strategy"] || null,
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
