#!/usr/bin/env node
// Publishes every non-deprecated skill as its own marketplace plugin, so users can
// browse and install skills individually (e.g. `claude plugin install
// hello-world@crestron-ai-skills`) instead of only through the registry-browser
// plugin. Generates:
//   plugins/<name>/.claude-plugin/plugin.json   Claude Code, Claude desktop, Copilot CLI, VS Code
//   plugins/<name>/.codex-plugin/plugin.json    OpenAI Codex
//   plugins/<name>/skills/<name>/...            copy of copilot-skills/<name>/ (minus tests/)
//   .claude-plugin/marketplace.json             registry-browser entry + one entry per skill
//   .agents/plugins/marketplace.json            Codex equivalent
//   .claude-plugin/plugin.json                  `skills` list synced (direct owner/repo installs)
//
// Built from copilot-skills/ (not skills/) because every tool discovers plugin
// skills as skills/<name>/SKILL.md — uppercase. Uses the same frontmatter parser
// and deprecated-skip rule as build-registry.js so the marketplace can never list
// a skill the registry hides. Run with --check to fail if committed output is stale.
const fs = require("fs");
const path = require("path");
const { parseFrontmatter } = require("./lib/skill-frontmatter");

const SOURCE_DIR = "copilot-skills";
const PLUGINS_DIR = "plugins";
const REGISTRY_PLUGIN = "crestron-ai-skills"; // hand-maintained registry-browser plugin
const REPO_URL = "https://github.com/Crestron/CrestronAISkills";
const EXCLUDE = new Set(["tests"]);
const CHECK = process.argv.includes("--check");

function readSkills() {
  const skills = [];
  const deprecated = [];
  for (const entry of fs.readdirSync(SOURCE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(SOURCE_DIR, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const { fm, malformed } = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
    if (malformed || !fm) throw new Error(`${skillMd}: ${malformed || "no frontmatter"}`);
    if (fm.name !== entry.name) throw new Error(`${skillMd}: name "${fm.name}" must match folder "${entry.name}"`);
    if (fm.name === REGISTRY_PLUGIN) throw new Error(`skill name "${REGISTRY_PLUGIN}" is reserved for the registry-browser plugin`);
    if (fm.deprecated === true) {
      deprecated.push(fm.name);
      continue;
    }
    skills.push(fm);
  }
  return {
    skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
    deprecated: deprecated.sort(),
  };
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

const json = (obj) => JSON.stringify(obj, null, 2) + "\n";

function writePlugin(root, fm) {
  const dir = path.join(root, PLUGINS_DIR, fm.name);
  const author = { name: fm.author || "Crestron" };
  const homepage = fm.homepage || `${REPO_URL}/tree/main/${SOURCE_DIR}/${fm.name}`;
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), json({
    name: fm.name,
    version: String(fm.version),
    description: fm.description,
    author,
    homepage,
    license: "See LICENSE",
    keywords: fm.tags || [],
  }));
  fs.writeFileSync(path.join(dir, ".codex-plugin", "plugin.json"), json({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: fm.name,
    version: String(fm.version),
    description: fm.description,
    extensions: { "com.openai": { interface: { displayName: fm.name, category: "Productivity" } } },
  }));
  copyDir(path.join(SOURCE_DIR, fm.name), path.join(dir, "skills", fm.name));
}

function claudeMarketplace(skills, deprecated) {
  const market = {
    $schema: "https://json.schemastore.org/claude-code-marketplace.json",
    name: "crestron-ai-skills",
    version: "1.0.0",
    description: "Crestron AI Skills — install individual skills, or the registry browser to search them all.",
    owner: { name: "Crestron", url: "https://github.com/Crestron" },
    plugins: [
      {
        name: REGISTRY_PLUGIN,
        description: "Search, inspect, and install skills from the CrestronAISkills registry (github.com/Crestron/CrestronAISkills).",
        source: `./${PLUGINS_DIR}/${REGISTRY_PLUGIN}`,
        category: "productivity",
        keywords: ["crestron", "skills", "marketplace", "registry"],
      },
      ...skills.map((fm) => ({
        name: fm.name,
        description: fm.description,
        source: `./${PLUGINS_DIR}/${fm.name}`,
        category: "productivity",
        keywords: fm.tags || [],
        author: { name: fm.author || "Crestron" },
      })),
    ],
  };
  // Previously published skills that are now deprecated: tell clients to remove them.
  if (deprecated.length) market.renames = Object.fromEntries(deprecated.map((n) => [n, null]));
  return market;
}

function codexMarketplace(skills) {
  const entry = (name) => ({
    name,
    source: { source: "local", path: `./${PLUGINS_DIR}/${name}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  });
  return {
    name: "crestron-ai-skills",
    interface: { displayName: "Crestron AI Skills" },
    plugins: [entry(REGISTRY_PLUGIN), ...skills.map((fm) => entry(fm.name))],
  };
}

// Writes the full generated output under `root` (the repo, or a temp dir for --check).
function build(root) {
  const { skills, deprecated } = readSkills();
  const pluginsRoot = path.join(root, PLUGINS_DIR);
  if (fs.existsSync(pluginsRoot)) {
    for (const entry of fs.readdirSync(pluginsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== REGISTRY_PLUGIN) {
        fs.rmSync(path.join(pluginsRoot, entry.name), { recursive: true, force: true });
      }
    }
  }
  for (const fm of skills) writePlugin(root, fm);
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "plugins"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), json(claudeMarketplace(skills, deprecated)));
  fs.writeFileSync(path.join(root, ".agents", "plugins", "marketplace.json"), json(codexMarketplace(skills)));
  // Root plugin.json (direct `owner/repo` installs) bundles all published skills; keep its list in sync.
  const rootPlugin = JSON.parse(fs.readFileSync(path.join(".claude-plugin", "plugin.json"), "utf8"));
  rootPlugin.description = `Crestron AI skills registry: shared agent skills (${skills.map((s) => s.name).join(", ")}) for use across Copilot CLI, VS Code, and Claude Code.`;
  rootPlugin.skills = skills.map((s) => `${SOURCE_DIR}/${s.name}/`);
  fs.writeFileSync(path.join(root, ".claude-plugin", "plugin.json"), json(rootPlugin));
  return { skills, deprecated };
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

module.exports = { build };

if (require.main !== module) {
  // Imported (tests) — don't run the CLI.
} else if (CHECK) {
  const os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-"));
  build(tmp);
  const norm = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const stale = [];
  for (const rel of [
    path.join(".claude-plugin", "marketplace.json"),
    path.join(".claude-plugin", "plugin.json"),
    path.join(".agents", "plugins", "marketplace.json"),
  ]) {
    if (!fs.existsSync(rel) || norm(rel) !== norm(path.join(tmp, rel))) stale.push(rel);
  }
  const genDirs = (root) =>
    listFiles(path.join(root, PLUGINS_DIR)).filter((f) => !f.startsWith(REGISTRY_PLUGIN + path.sep));
  const expected = new Set(genDirs(tmp));
  const actual = new Set(genDirs("."));
  for (const f of new Set([...expected, ...actual])) {
    const a = path.join(PLUGINS_DIR, f);
    if (!expected.has(f) || !actual.has(f) || norm(a) !== norm(path.join(tmp, PLUGINS_DIR, f))) stale.push(a);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (stale.length) {
    console.error("❌ Marketplace output is stale — run `node .github/scripts/build-marketplace.js` and commit:");
    stale.forEach((f) => console.error("   " + f));
    process.exit(1);
  }
  console.log("✓ Marketplace output is up to date.");
} else {
  const { skills, deprecated } = build(".");
  console.log(`Marketplace generated: ${skills.length} skill plugin(s) + ${REGISTRY_PLUGIN}`);
  if (deprecated.length) console.log(`Skipped (deprecated): ${deprecated.join(", ")}`);
}
