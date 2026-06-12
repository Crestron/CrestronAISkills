#!/usr/bin/env node
// Validates changed skill directories against skill-schema.json rules and C1 checklist.
// Usage: CHANGED_DIRS="skills/foo skills/bar" node validate-skill.js

const fs = require("fs");
const path = require("path");

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VER_RE  = /^\d+\.\d+\.\d+$/;
const TAG_RE  = /^[a-z][a-z0-9-]*$/;

function parseFrontmatter(content) {
  const lines = content.split("\n");
  const fm = {};
  let inFm = false, fmDone = false, inMeta = false;

  for (const line of lines) {
    if (fmDone) break;

    if (line.trim() === "---") {
      if (!inFm) { inFm = true; continue; }
      fmDone = true; break;
    }

    if (!inFm) continue;

    // Indented metadata sub-keys
    if (/^\s+\w/.test(line) && inMeta) {
      const m = line.match(/^\s+([a-z][\w-]*):\s*(.+)/);
      if (m) {
        if (!fm.metadata) fm.metadata = {};
        fm.metadata[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
      }
      continue;
    }

    inMeta = false;

    const m = line.match(/^([a-z][\w-]*):\s*(.*)/);
    if (!m) continue;
    const [, key, raw] = m;
    const val = raw.trim();

    if (key === "metadata") {
      inMeta = true;
      if (!fm.metadata) fm.metadata = {};
    } else if (key === "tags") {
      fm.tags = val
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^['"]|['"]$/g, "");
    }
  }

  return fm;
}

const rawDirs = (process.env.CHANGED_DIRS || "").trim();
const dirs = rawDirs.split(/[\s\n]+/).filter(Boolean);

if (!dirs.length) {
  console.log("No skill directories changed.");
  process.exit(0);
}

let anyError = false;

for (const dir of dirs) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

  const skillMd = path.join(dir, "skill.md");
  const dirName = path.basename(dir);
  const errors = [];
  const warnings = [];

  console.log(`\n── ${dir} ──`);

  if (!fs.existsSync(skillMd)) {
    console.log("  ✗ Missing skill.md");
    anyError = true;
    continue;
  }

  const content = fs.readFileSync(skillMd, "utf8");

  if (!content.startsWith("---")) {
    errors.push("skill.md must begin with YAML frontmatter (---)");
  }

  const fm = parseFrontmatter(content);

  if (fm.deprecated === "true" || fm.deprecated === true) {
    console.log("  ⏸  deprecated: true — skipped from registry, not validated");
    continue;
  }

  // name
  if (!fm.name) {
    errors.push("Missing required field: name");
  } else {
    if (!NAME_RE.test(fm.name))
      errors.push(
        `name "${fm.name}" must be lowercase letters/numbers/hyphens — no leading, trailing, or consecutive hyphens`
      );
    if (fm.name.length > 64)
      errors.push(`name exceeds 64 characters (${fm.name.length})`);
    if (fm.name !== dirName)
      errors.push(`name "${fm.name}" must match directory name "${dirName}"`);
  }

  // version
  if (!fm.version) {
    errors.push("Missing required field: version");
  } else if (!VER_RE.test(fm.version)) {
    errors.push(`version "${fm.version}" must be semantic version — e.g. 1.0.0`);
  }

  // description
  if (!fm.description) {
    errors.push("Missing required field: description");
  } else {
    if (fm.description.length < 10)
      errors.push(
        `description too short (${fm.description.length} chars, min 10)`
      );
    if (fm.description.length > 1024)
      errors.push(
        `description too long (${fm.description.length} chars, max 1024)`
      );
  }

  // tags
  if (!fm.tags || !fm.tags.length) {
    errors.push(
      "Missing required field: tags — must be a non-empty array, e.g. [crestron, av]"
    );
  } else {
    for (const tag of fm.tags) {
      if (!TAG_RE.test(tag))
        errors.push(`tag "${tag}" must be lowercase letters/numbers/hyphens`);
    }
  }

  // author
  if (!fm.author) {
    errors.push("Missing required field: author");
  }

  // C1 checklist — warn on missing metadata fields (require human approval, not CI block)
  if (!fm.metadata?.team)
    warnings.push("metadata.team not set — required for C1 registry approval");
  if (!fm.metadata?.maintainer)
    warnings.push("metadata.maintainer not set — required for C1 registry approval");
  if (!fm.metadata?.dependencies)
    warnings.push("metadata.dependencies not set — required for C1 registry approval");

  errors.forEach((e) => console.log("  ✗ " + e));
  warnings.forEach((w) => console.log("  ⚠  " + w));

  if (errors.length) {
    anyError = true;
  } else {
    console.log("  ✓ Passes skill-schema.json validation");
    if (warnings.length)
      console.log("  ℹ  Warnings above need human review before merge (C1 checklist)");
  }
}

console.log("");
if (anyError) {
  console.log("❌ Validation failed — fix errors before requesting review.");
  console.log("   Reference: skill-schema.json and CONTRIBUTING.md");
  process.exit(1);
} else {
  console.log("✅ Schema validation passed.");
  if (dirs.length)
    console.log("   Any ⚠ warnings require the C1–C4 checklist to be completed at review.");
}
