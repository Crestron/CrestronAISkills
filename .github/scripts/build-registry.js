#!/usr/bin/env node
// Builds web/dist/registry.json from skills/. Reuses the same frontmatter parser
// as validate-skill.js/scan-skill-security.js instead of a third independent
// regex implementation, so registry contents can never drift from what CI
// actually validated.
const fs = require("fs");
const path = require("path");
const { parseFrontmatter } = require("./lib/skill-frontmatter");

const skillsDir = "skills";
const skills = [];

if (fs.existsSync(skillsDir)) {
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mp = path.join(skillsDir, entry.name, "skill.md");
    if (!fs.existsSync(mp)) continue;

    const content = fs.readFileSync(mp, "utf8");
    const { fm, malformed } = parseFrontmatter(content);
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
      path: `${skillsDir}/${entry.name}`,
      license: fm.license || "MIT",
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

fs.writeFileSync("web/dist/registry.json", JSON.stringify(registry, null, 2) + "\n");
console.log("Registry generated:", skills.length, "skill(s)");
