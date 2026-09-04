const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { writeManifest, readManifest, diffAgainstManifest, computeFileHashes, MANIFEST_FILENAME } = require("./lib/content-hash");

function tempSkillDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-hash-test-"));
  fs.writeFileSync(path.join(dir, "skill.md"), "---\nname: x\n---\nbody\n");
  return dir;
}

test("computeFileHashes excludes the manifest file itself", () => {
  const dir = tempSkillDir();
  writeManifest(dir, { skill: "x", version: "1.0.0", sourceRef: null });
  const hashes = computeFileHashes(dir);
  assert.equal(Object.keys(hashes).includes(MANIFEST_FILENAME), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("writeManifest + readManifest round-trip", () => {
  const dir = tempSkillDir();
  const written = writeManifest(dir, { skill: "x", version: "1.0.0", sourceRef: "abc123" });
  const read = readManifest(dir);
  assert.deepEqual(read, written);
  assert.equal(read.sourceRef, "abc123");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readManifest returns null when no baseline exists", () => {
  const dir = tempSkillDir();
  assert.equal(readManifest(dir), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("diffAgainstManifest detects unchanged, changed, added, and removed files", () => {
  const dir = tempSkillDir();
  const stored = writeManifest(dir, { skill: "x", version: "1.0.0", sourceRef: null });

  // No changes yet.
  assert.deepEqual(diffAgainstManifest(dir, stored), []);

  // Change an existing file.
  fs.writeFileSync(path.join(dir, "skill.md"), "---\nname: x\n---\ntampered\n");
  // Add a new file.
  fs.writeFileSync(path.join(dir, "extra.txt"), "new");

  const diffs = diffAgainstManifest(dir, stored).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(diffs, [
    { path: "extra.txt", status: "added" },
    { path: "skill.md", status: "changed" },
  ]);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("diffAgainstManifest detects a removed file", () => {
  const dir = tempSkillDir();
  fs.writeFileSync(path.join(dir, "extra.txt"), "will be removed");
  const stored = writeManifest(dir, { skill: "x", version: "1.0.0", sourceRef: null });

  fs.unlinkSync(path.join(dir, "extra.txt"));
  const diffs = diffAgainstManifest(dir, stored);
  assert.deepEqual(diffs, [{ path: "extra.txt", status: "removed" }]);

  fs.rmSync(dir, { recursive: true, force: true });
});
