const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("./build-marketplace");
const { parseFrontmatter } = require("./lib/skill-frontmatter");

// Builds from the repo's real copilot-skills/ into a temp root, so the test
// tracks whatever skills are actually published. Run from the repo root (npm test).
function buildToTemp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-test-"));
  const result = build(root);
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  return { root, result, read };
}

test("registry-browser plugin is listed first in both marketplaces", () => {
  const { root, read } = buildToTemp();
  assert.equal(read(".claude-plugin/marketplace.json").plugins[0].name, "crestron-ai-skills");
  assert.equal(read(".agents/plugins/marketplace.json").plugins[0].name, "crestron-ai-skills");
  fs.rmSync(root, { recursive: true, force: true });
});

test("every published skill gets a plugin whose version matches its SKILL.md", () => {
  const { root, result, read } = buildToTemp();
  assert.ok(result.skills.length > 0);
  for (const fm of result.skills) {
    const manifest = read(`plugins/${fm.name}/.claude-plugin/plugin.json`);
    assert.equal(manifest.version, String(fm.version));
    assert.equal(read(`plugins/${fm.name}/.codex-plugin/plugin.json`).version, String(fm.version));
    const copied = fs.readFileSync(path.join(root, "plugins", fm.name, "skills", fm.name, "SKILL.md"), "utf8");
    assert.equal(parseFrontmatter(copied).fm.name, fm.name);
    assert.equal(fs.existsSync(path.join(root, "plugins", fm.name, "skills", fm.name, "tests")), false);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("plugin SKILL.md uses only Agent Skills spec frontmatter with string metadata", () => {
  const SPEC_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
  const { root, result } = buildToTemp();
  for (const skill of result.skills) {
    const content = fs.readFileSync(path.join(root, "plugins", skill.name, "skills", skill.name, "SKILL.md"), "utf8");
    const { fm, body } = parseFrontmatter(content);
    for (const key of Object.keys(fm)) assert.ok(SPEC_KEYS.has(key), `${skill.name}: non-spec key "${key}"`);
    for (const [k, v] of Object.entries(fm.metadata || {})) assert.equal(typeof v, "string", `${skill.name}: metadata.${k} must be a string`);
    assert.equal(fm.metadata.version, String(skill.version));
    assert.ok(body.trim().length > 0, `${skill.name}: skill body must be preserved`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("marketplace entries carry no version (plugin.json owns it)", () => {
  const { root, read } = buildToTemp();
  for (const entry of read(".claude-plugin/marketplace.json").plugins) {
    assert.equal("version" in entry, false, `${entry.name} entry must not set version`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("deprecated skills are not published and are marked for removal", () => {
  const { root, result, read } = buildToTemp();
  const market = read(".claude-plugin/marketplace.json");
  for (const name of result.deprecated) {
    assert.equal(fs.existsSync(path.join(root, "plugins", name)), false);
    assert.equal(market.plugins.some((p) => p.name === name), false);
    assert.equal(market.renames[name], null);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("root plugin.json skills list matches published skills", () => {
  const { root, result, read } = buildToTemp();
  assert.deepEqual(read(".claude-plugin/plugin.json").skills, result.skills.map((s) => `copilot-skills/${s.name}/`));
  fs.rmSync(root, { recursive: true, force: true });
});
