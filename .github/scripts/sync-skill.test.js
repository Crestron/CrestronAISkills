const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  resolveSourcePath,
  mergeFrontmatter,
  serializeSkillMd,
  syncSkill,
} = require("./lib/sync-skill");
const { parseFrontmatter } = require("./lib/skill-frontmatter");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sync-skill-test-"));
}

test("resolveSourcePath rejects absolute paths", () => {
  assert.throws(() => resolveSourcePath("/etc/passwd"), /must be relative/);
  assert.throws(() => resolveSourcePath("C:\\Windows"), /must be relative/);
});

test("resolveSourcePath rejects traversal", () => {
  assert.throws(() => resolveSourcePath("../../etc"), /escapes/);
  assert.throws(() => resolveSourcePath("a/../../b"), /escapes/);
});

test("resolveSourcePath rejects empty/root", () => {
  assert.throws(() => resolveSourcePath(""), /non-empty/);
  assert.throws(() => resolveSourcePath("."), /repo root/);
});

test("resolveSourcePath accepts a normal nested path", () => {
  assert.equal(resolveSourcePath("ai-skills/my-skill"), "ai-skills/my-skill");
});

test("mergeFrontmatter on fresh import: content from incoming, no existing metadata to preserve", () => {
  const incoming = {
    name: "widget-helper",
    description: "Helps with widgets",
    version: "1.0.0",
    tags: ["widgets"],
    author: "team-widgets",
  };
  const provenance = {
    sourceRepo: "https://github.com/Crestron/team-widgets",
    sourceRef: "abc123",
    sourcePath: "skills/widget-helper",
    syncedAt: "2026-01-01T00:00:00.000Z",
  };
  const merged = mergeFrontmatter(null, incoming, provenance);

  assert.equal(merged.name, "widget-helper");
  assert.equal(merged.version, "1.0.0");
  assert.equal(merged.metadata["source-repo"], provenance.sourceRepo);
  assert.equal(merged.metadata["source-ref"], "abc123");
  assert.equal(merged.metadata["source-path"], "skills/widget-helper");
  assert.equal(merged.metadata["synced-at"], provenance.syncedAt);
  // No Crestron compliance fields present — nothing to preserve, and none
  // scaffolded. validate-skill.js's existing required-field errors are what
  // prompt a human to fill these in.
  assert.equal(merged.metadata.team, undefined);
  assert.equal(merged.metadata["scope-allow"], undefined);
});

test("mergeFrontmatter on re-sync: preserves human-filled compliance fields, updates content + provenance", () => {
  const existing = {
    name: "widget-helper",
    version: "1.0.0",
    metadata: {
      team: "crestron-ai",
      maintainer: "sabtain.khan",
      "scope-allow": ["skills/widget-helper/**"],
      "test-strategy": "manual",
      "approved-by": "sabtain.khan",
      "approval-date": "2026-01-05",
      "source-repo": "https://github.com/Crestron/team-widgets",
      "source-ref": "abc123",
      "source-path": "skills/widget-helper",
      "synced-at": "2026-01-01T00:00:00.000Z",
    },
  };
  const incoming = {
    name: "widget-helper",
    description: "Helps with widgets, now with more widgets",
    version: "1.1.0",
    tags: ["widgets"],
    author: "team-widgets",
  };
  const provenance = {
    sourceRepo: "https://github.com/Crestron/team-widgets",
    sourceRef: "def456",
    sourcePath: "skills/widget-helper",
    syncedAt: "2026-02-01T00:00:00.000Z",
  };
  const merged = mergeFrontmatter(existing, incoming, provenance);

  // Content updates from upstream.
  assert.equal(merged.version, "1.1.0");
  assert.equal(merged.description, "Helps with widgets, now with more widgets");
  // Provenance always overwritten to the new sync.
  assert.equal(merged.metadata["source-ref"], "def456");
  assert.equal(merged.metadata["synced-at"], "2026-02-01T00:00:00.000Z");
  // Human-filled compliance fields survive untouched.
  assert.equal(merged.metadata.team, "crestron-ai");
  assert.deepEqual(merged.metadata["scope-allow"], ["skills/widget-helper/**"]);
  assert.equal(merged.metadata["approved-by"], "sabtain.khan");
});

test("serializeSkillMd round-trips through parseFrontmatter", () => {
  const fm = { name: "x", version: "1.0.0", metadata: { "source-repo": "https://github.com/a/b" } };
  const content = serializeSkillMd(fm, "# Body\n\nHello.\n");
  const { fm: parsed, body, malformed } = parseFrontmatter(content);
  assert.equal(malformed, null);
  assert.equal(parsed.name, "x");
  assert.equal(parsed.metadata["source-repo"], "https://github.com/a/b");
  assert.match(body, /# Body/);
});

test("syncSkill: fresh import copies files, stamps provenance, writes copilot mirror", () => {
  const sourceRoot = tempDir();
  const repoRoot = tempDir();
  fs.mkdirSync(path.join(sourceRoot, "ai-skills/widget-helper/tests"), { recursive: true });
  fs.writeFileSync(
    path.join(sourceRoot, "ai-skills/widget-helper/skill.md"),
    "---\nname: widget-helper\ndescription: Helps with widgets, ten chars plus\nversion: 1.0.0\ntags: [widgets]\nauthor: team-widgets\n---\n# Widget Helper\n"
  );
  fs.writeFileSync(path.join(sourceRoot, "ai-skills/widget-helper/tests/evals.md"), "eval log");

  const targetSkillDir = path.join(repoRoot, "skills/widget-helper");
  const mirrorDir = path.join(repoRoot, "copilot-skills/widget-helper");

  const { isNewSkill } = syncSkill({
    sourceRepoRoot: sourceRoot,
    sourcePath: "ai-skills/widget-helper",
    targetSkillDir,
    mirrorDir,
    provenance: {
      sourceRepo: "https://github.com/Crestron/team-widgets",
      sourceRef: "abc123",
      sourcePath: "ai-skills/widget-helper",
      syncedAt: "2026-01-01T00:00:00.000Z",
    },
  });

  assert.equal(isNewSkill, true);
  const written = fs.readFileSync(path.join(targetSkillDir, "skill.md"), "utf8");
  const { fm } = parseFrontmatter(written);
  assert.equal(fm.name, "widget-helper");
  assert.equal(fm.metadata["source-ref"], "abc123");
  assert.ok(fs.existsSync(path.join(mirrorDir, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(targetSkillDir, "tests/evals.md")));
  assert.ok(fs.existsSync(path.join(mirrorDir, "tests/evals.md")));

  fs.rmSync(sourceRoot, { recursive: true, force: true });
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("syncSkill: re-sync preserves previously-approved compliance fields", () => {
  const sourceRoot = tempDir();
  const repoRoot = tempDir();
  fs.mkdirSync(path.join(sourceRoot, "widget-helper"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "skills/widget-helper"), { recursive: true });

  fs.writeFileSync(
    path.join(repoRoot, "skills/widget-helper/skill.md"),
    "---\nname: widget-helper\ndescription: Helps with widgets, ten chars plus\nversion: 1.0.0\ntags: [widgets]\nauthor: team-widgets\nmetadata:\n  team: crestron-ai\n  approved-by: sabtain.khan\n  source-repo: https://github.com/Crestron/team-widgets\n  source-ref: abc123\n  source-path: widget-helper\n  synced-at: '2026-01-01T00:00:00.000Z'\n---\n# Widget Helper\n"
  );
  fs.writeFileSync(
    path.join(sourceRoot, "widget-helper/skill.md"),
    "---\nname: widget-helper\ndescription: Helps with widgets, now updated\nversion: 1.1.0\ntags: [widgets]\nauthor: team-widgets\n---\n# Widget Helper v2\n"
  );

  const targetSkillDir = path.join(repoRoot, "skills/widget-helper");
  const mirrorDir = path.join(repoRoot, "copilot-skills/widget-helper");

  const { isNewSkill } = syncSkill({
    sourceRepoRoot: sourceRoot,
    sourcePath: "widget-helper",
    targetSkillDir,
    mirrorDir,
    provenance: {
      sourceRepo: "https://github.com/Crestron/team-widgets",
      sourceRef: "def456",
      sourcePath: "widget-helper",
      syncedAt: "2026-02-01T00:00:00.000Z",
    },
  });

  assert.equal(isNewSkill, false);
  const { fm } = parseFrontmatter(fs.readFileSync(path.join(targetSkillDir, "skill.md"), "utf8"));
  assert.equal(fm.version, "1.1.0");
  assert.equal(fm.metadata["source-ref"], "def456");
  assert.equal(fm.metadata.team, "crestron-ai");
  assert.equal(fm.metadata["approved-by"], "sabtain.khan");

  fs.rmSync(sourceRoot, { recursive: true, force: true });
  fs.rmSync(repoRoot, { recursive: true, force: true });
});
