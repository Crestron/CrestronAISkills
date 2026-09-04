// C.5.1.3 content-hash baseline: SHA-256 of every file in a skill's directory,
// recorded against the pinned reference it was approved at. This is the
// literal baseline the Skill Runtime Companion doc (CAAD-3186655238) says
// load-time/repository-side drift detection (S.4) reads from — kept as its
// own file, not inside skill.md's frontmatter, since a file hashing its own
// content (including the hash field) is circular.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { listFilesRecursive } = require("./skill-frontmatter");

const MANIFEST_FILENAME = ".content-hash.json";

// Reads as text and normalizes CRLF -> LF before hashing. Without this, a
// manifest generated on a Windows checkout (core.autocrlf=true, CRLF working
// tree) would never match what a Linux CI runner computes from the same git
// blob (stored + checked out as LF) - guaranteeing false "drift" findings on
// every skill the moment the weekly scan ran. Line-ending conversion carries
// no semantic meaning for the text-only files skill bundles contain, so
// normalizing is the correct call here, same principle already applied to
// the copilot-mirror-drift and version-bump checks in validate-skill.js.
function sha256(filePath) {
  const content = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function manifestPath(skillDir) {
  return path.join(skillDir, MANIFEST_FILENAME);
}

// Hashes every file under skillDir except the manifest file itself.
function computeFileHashes(skillDir) {
  const files = {};
  for (const file of listFilesRecursive(skillDir)) {
    const rel = path.relative(skillDir, file).replace(/\\/g, "/");
    if (rel === MANIFEST_FILENAME) continue;
    files[rel] = sha256(file);
  }
  return files;
}

function readManifest(skillDir) {
  const p = manifestPath(skillDir);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(skillDir, { skill, version, sourceRef }) {
  const manifest = {
    skill,
    version,
    sourceRef: sourceRef || null,
    computedAt: new Date().toISOString(),
    files: computeFileHashes(skillDir),
  };
  fs.writeFileSync(manifestPath(skillDir), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

// Diffs the CURRENT on-disk file hashes against a previously stored manifest.
// Returns [] if nothing changed.
function diffAgainstManifest(skillDir, storedManifest) {
  const current = computeFileHashes(skillDir);
  const stored = (storedManifest && storedManifest.files) || {};
  const diffs = [];
  for (const p of new Set([...Object.keys(current), ...Object.keys(stored)])) {
    if (!(p in stored)) diffs.push({ path: p, status: "added" });
    else if (!(p in current)) diffs.push({ path: p, status: "removed" });
    else if (current[p] !== stored[p]) diffs.push({ path: p, status: "changed" });
  }
  return diffs;
}

module.exports = { MANIFEST_FILENAME, manifestPath, computeFileHashes, readManifest, writeManifest, diffAgainstManifest };
