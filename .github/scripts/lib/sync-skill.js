// Pure logic for mirroring a skill from a source repo into skills/<name>/.
// Kept dependency-free of any GitHub Actions/CLI concerns so it's unit-testable
// against plain temp directories (see sync-skill.test.js).
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { parseFrontmatter } = require("./skill-frontmatter");

// A source path is a location *within* the source repo, never an absolute path
// or a traversal out of it — reject before it's ever joined into a real
// filesystem path. Same containment-first pattern as clear-locale-files.ps1 and
// writeReport() in validate-skill.js.
function resolveSourcePath(sourcePath) {
  if (!sourcePath || typeof sourcePath !== "string") {
    throw new Error("source path must be a non-empty string");
  }
  if (sourcePath.startsWith("/") || sourcePath.startsWith("\\") || /^[a-zA-Z]:/.test(sourcePath)) {
    throw new Error(`source path "${sourcePath}" must be relative to the source repo root, not absolute`);
  }
  const normalized = path.posix.normalize(sourcePath.replace(/\\/g, "/"));
  if (normalized === "." || normalized === "") {
    throw new Error("source path must not be empty or the repo root");
  }
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`source path "${sourcePath}" escapes the source repository`);
  }
  return normalized;
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

// Copies the skill's directory from the checked-out source repo into
// targetSkillDir. Re-validates the resolved path stays inside sourceRepoRoot
// even after joining (defense in depth beyond resolveSourcePath's string check).
function copySkillFiles(sourceRepoRoot, sourcePath, targetSkillDir) {
  const normalized = resolveSourcePath(sourcePath);
  const sourceRoot = path.resolve(sourceRepoRoot);
  const sourceDir = path.resolve(sourceRoot, normalized);
  if (sourceDir !== sourceRoot && !sourceDir.startsWith(sourceRoot + path.sep)) {
    throw new Error(`resolved source path "${sourceDir}" escapes the source repository root`);
  }
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`source path "${sourcePath}" does not exist in the source repository`);
  }
  copyDirRecursive(sourceDir, targetSkillDir);
}

// Re-sync merge rule: content fields always come from the incoming (source
// repo's) frontmatter; source-*/synced-at always come from provenance; every
// other existing metadata key (scope-allow, test-strategy, approved-by, etc.)
// is preserved from what's already committed here if present, otherwise left
// absent — validate-skill.js's existing required-field errors are what prompt
// a human to fill those in on the PR, so no separate scaffolding is needed.
function mergeFrontmatter(existingFm, incomingFm, provenance) {
  if (!incomingFm || typeof incomingFm !== "object") {
    throw new Error("incoming frontmatter must be a parsed object");
  }
  const merged = {
    name: incomingFm.name,
    description: incomingFm.description,
    version: incomingFm.version,
    tags: incomingFm.tags,
    author: incomingFm.author,
  };
  for (const passthrough of ["license", "compatibility", "allowed-tools", "homepage", "deprecated"]) {
    if (incomingFm[passthrough] !== undefined) merged[passthrough] = incomingFm[passthrough];
  }
  merged.metadata = {
    ...(existingFm && existingFm.metadata ? existingFm.metadata : {}),
    "source-repo": provenance.sourceRepo,
    "source-ref": provenance.sourceRef,
    "source-path": provenance.sourcePath,
    "synced-at": provenance.syncedAt,
  };
  return merged;
}

function serializeSkillMd(frontmatter, body) {
  const yamlBlock = yaml.dump(frontmatter, { lineWidth: -1 });
  return `---\n${yamlBlock}---\n${body}`;
}

// Mirrors skills/<name>/ into copilot-skills/<name>/SKILL.md, matching the
// existing manual-mirror convention checked by validate-skill.js's drift check.
function writeCopilotMirror(skillDir, mirrorDir) {
  fs.mkdirSync(mirrorDir, { recursive: true });
  fs.writeFileSync(
    path.join(mirrorDir, "SKILL.md"),
    fs.readFileSync(path.join(skillDir, "skill.md"), "utf8")
  );
  for (const entry of fs.readdirSync(skillDir, { withFileTypes: true })) {
    if (entry.name === "skill.md") continue;
    const s = path.join(skillDir, entry.name);
    const d = path.join(mirrorDir, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Full orchestration: copy from source, merge frontmatter, write skill.md +
// the copilot-skills mirror. Reads the pre-existing skill.md (if any) before
// it gets overwritten by the copy, so a re-sync can preserve human-filled
// compliance fields.
function syncSkill({ sourceRepoRoot, sourcePath, targetSkillDir, mirrorDir, provenance }) {
  let existingFm = null;
  const existingSkillMd = path.join(targetSkillDir, "skill.md");
  if (fs.existsSync(existingSkillMd)) {
    const parsed = parseFrontmatter(fs.readFileSync(existingSkillMd, "utf8"));
    if (!parsed.malformed) existingFm = parsed.fm;
  }

  copySkillFiles(sourceRepoRoot, sourcePath, targetSkillDir);

  const incomingContent = fs.readFileSync(existingSkillMd, "utf8");
  const { fm: incomingFm, body: incomingBody, malformed } = parseFrontmatter(incomingContent);
  if (malformed) throw new Error(`source skill.md frontmatter is malformed: ${malformed}`);

  const merged = mergeFrontmatter(existingFm, incomingFm, provenance);
  fs.writeFileSync(existingSkillMd, serializeSkillMd(merged, incomingBody));
  writeCopilotMirror(targetSkillDir, mirrorDir);

  return { merged, isNewSkill: existingFm === null };
}

module.exports = {
  resolveSourcePath,
  copySkillFiles,
  mergeFrontmatter,
  serializeSkillMd,
  writeCopilotMirror,
  syncSkill,
};
