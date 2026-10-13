const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { productionize } = require("./productionize");

// Minimal staging-shaped git repo; build-marketplace.js is stubbed so the test
// only exercises productionize's own rewrite/removal logic.
function stagingFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "productionize-test-"));
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  write("Readme.md", [
    "# Title",
    "<!-- STAGING:BEGIN -->",
    "> staging banner",
    "<!-- STAGING:END -->",
    "claude plugin marketplace add CrestronEng/CrestronAISkills-staging",
    "claude plugin install hello-world@crestron-ai-skills-staging",
    "Optionally install crestron-ai-skills (registry browser).",
    "",
  ].join("\n"));
  write(".github/workflows/sync-skill.yml", "name: sync\n");
  write(".github/workflows/promote-to-production.yml", "name: promote\n");
  write("scripts/sync-skill-local.sh", "TARGET_REPO=\"CrestronEng/CrestronAISkills-staging\"\n");
  write(".github/scripts/build-marketplace.js", "// stub\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

test("productionize swaps staging identity, strips banner, removes staging-only files", () => {
  const root = stagingFixture();
  const { removed } = productionize(root);
  const readme = fs.readFileSync(path.join(root, "Readme.md"), "utf8");

  assert.doesNotMatch(readme, /STAGING|staging banner/);
  assert.match(readme, /marketplace add Crestron\/CrestronAISkills\n/);
  assert.match(readme, /hello-world@crestron-ai-skills\n/);
  // The registry-browser plugin name is left alone.
  assert.match(readme, /Optionally install crestron-ai-skills \(registry browser\)/);

  for (const rel of [".github/workflows/sync-skill.yml", ".github/workflows/promote-to-production.yml", "scripts/sync-skill-local.sh"]) {
    assert.equal(fs.existsSync(path.join(root, rel)), false, `${rel} should be removed`);
    assert.ok(removed.includes(rel));
  }
  fs.rmSync(root, { recursive: true, force: true });
});
