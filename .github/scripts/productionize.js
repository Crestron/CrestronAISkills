#!/usr/bin/env node
// Turns a checkout of the STAGING repo into what gets published to PRODUCTION.
// Run by .github/workflows/promote-to-production.yml on a throwaway copy — never
// commit its output back to staging.
//
//  1. Swaps the staging identity for production's in every tracked text file:
//       CrestronEng/CrestronAISkills-staging -> Crestron/CrestronAISkills
//       crestron-ai-skills-staging           -> crestron-ai-skills   (marketplace name)
//     Both staging tokens are unique strings, so a plain replace is safe and the
//     registry-browser plugin (also named crestron-ai-skills) is untouched.
//  2. Removes <!-- STAGING:BEGIN --> ... <!-- STAGING:END --> blocks (README banner).
//  3. Deletes staging-only files (sync tooling, promotion workflow).
//  4. Regenerates the per-skill plugins + marketplace files with the production name.
//
// Usage: node .github/scripts/productionize.js [repoRoot]   (default: cwd)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPLACEMENTS = [
  ["CrestronEng/CrestronAISkills-staging", "Crestron/CrestronAISkills"],
  ["crestron-ai-skills-staging", "crestron-ai-skills"],
];

// Staging-only: production only ever changes through promotion, never through sync.
const STAGING_ONLY = [
  ".github/workflows/sync-skill.yml",
  ".github/workflows/promote-to-production.yml",
  ".github/scripts/sync-skill.js",
  "scripts/sync-skill-local.ps1",
  "scripts/sync-skill-local.sh",
  "docs/runbooks/github-app-setup.md",
  "docs/runbooks/skill-sync-local.md",
  "docs/runbooks/skill-sync-webhook.md",
  "docs/runbooks/promote-to-production.md",
];

// Files that legitimately contain the staging tokens (this script and its test).
const SELF = new Set([".github/scripts/productionize.js", ".github/scripts/productionize.test.js"]);

// Also eats the blank line after the block so the surrounding text closes up cleanly.
const BANNER = /[ \t]*<!-- STAGING:BEGIN[\s\S]*?<!-- STAGING:END -->[ \t]*(?:\r?\n){0,2}/g;
const TEXT_EXT = new Set([".md", ".json", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".yml", ".yaml",
  ".ps1", ".sh", ".html", ".css", ".txt", ".toml", ""]);

function trackedFiles(root) {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

function productionize(root) {
  const changed = [];
  for (const rel of trackedFiles(root)) {
    const file = path.join(root, rel);
    if (SELF.has(rel) || !fs.existsSync(file) || !TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
    const before = fs.readFileSync(file, "utf8");
    let after = before.replace(BANNER, "");
    for (const [from, to] of REPLACEMENTS) after = after.split(from).join(to);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed.push(rel);
    }
  }
  const removed = [];
  for (const rel of STAGING_ONLY) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed.push(rel);
    }
  }
  // Regenerate plugins/marketplaces from the (now production) generator.
  execFileSync(process.execPath, [path.join(root, ".github/scripts/build-marketplace.js")], { cwd: root, stdio: "inherit" });
  return { changed, removed };
}

module.exports = { productionize, REPLACEMENTS, STAGING_ONLY };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || ".");
  const { changed, removed } = productionize(root);
  console.log(`Productionized ${root}: rewrote ${changed.length} file(s), removed ${removed.length} staging-only file(s).`);
  removed.forEach((r) => console.log("  - " + r));
  // Fail loudly if anything staging-specific survived.
  const leftovers = trackedFiles(root).filter((rel) => {
    const file = path.join(root, rel);
    if (SELF.has(rel) || !fs.existsSync(file) || !TEXT_EXT.has(path.extname(rel).toLowerCase())) return false;
    const text = fs.readFileSync(file, "utf8");
    return REPLACEMENTS.some(([from]) => text.includes(from)) || text.includes("STAGING:BEGIN");
  });
  if (leftovers.length) {
    console.error("Staging identity still present in:\n  " + leftovers.join("\n  "));
    process.exit(1);
  }
}
