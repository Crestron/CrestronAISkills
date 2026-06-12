#!/usr/bin/env node
// Validates changed skill directories against skill-schema.json rules and C1 checklist.
// Usage: CHANGED_DIRS="skills/foo skills/bar" node validate-skill.js

const fs = require("fs");
const path = require("path");

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VER_RE  = /^\d+\.\d+\.\d+$/;
const TAG_RE  = /^[a-z][a-z0-9-]*$/;

const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY || null;
const summaryLines = [];

function writeSummary(line) {
  summaryLines.push(line);
}

function flushSummary() {
  if (!SUMMARY_FILE) return;
  fs.appendFileSync(SUMMARY_FILE, summaryLines.join("\n") + "\n");
}

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
let totalWarnings = 0;
const skillResults = [];

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
    skillResults.push({ dir, errors: ["Missing skill.md"], warnings: [], deprecated: false });
    continue;
  }

  const content = fs.readFileSync(skillMd, "utf8");

  if (!content.startsWith("---")) {
    errors.push("skill.md must begin with YAML frontmatter (---)");
  }

  const fm = parseFrontmatter(content);

  if (fm.deprecated === "true" || fm.deprecated === true) {
    console.log("  ⏸  deprecated: true — skipped from registry, not validated");
    skillResults.push({ dir, errors: [], warnings: [], deprecated: true });
    continue;
  }

  // name
  if (!fm.name) {
    errors.push("Missing required field: `name`");
  } else {
    if (!NAME_RE.test(fm.name))
      errors.push(`\`name\` "${fm.name}" must be lowercase letters/numbers/hyphens — no leading, trailing, or consecutive hyphens`);
    if (fm.name.length > 64)
      errors.push(`\`name\` exceeds 64 characters (${fm.name.length})`);
    if (fm.name !== dirName)
      errors.push(`\`name\` "${fm.name}" must match directory name "${dirName}"`);
  }

  // version
  if (!fm.version) {
    errors.push("Missing required field: `version`");
  } else if (!VER_RE.test(fm.version)) {
    errors.push(`\`version\` "${fm.version}" must be semantic version — e.g. 1.0.0`);
  }

  // description
  if (!fm.description) {
    errors.push("Missing required field: `description`");
  } else {
    if (fm.description.length < 10)
      errors.push(`\`description\` too short (${fm.description.length} chars, min 10)`);
    if (fm.description.length > 1024)
      errors.push(`\`description\` too long (${fm.description.length} chars, max 1024)`);
  }

  // tags
  if (!fm.tags || !fm.tags.length) {
    errors.push("Missing required field: `tags` — must be a non-empty array, e.g. `[crestron, av]`");
  } else {
    for (const tag of fm.tags) {
      if (!TAG_RE.test(tag))
        errors.push(`tag "${tag}" must be lowercase letters/numbers/hyphens`);
    }
  }

  // author
  if (!fm.author) {
    errors.push("Missing required field: `author`");
  }

  // C1 checklist — team and maintainer are required; dependencies required but "None" is acceptable
  if (!fm.metadata?.team)
    errors.push("`metadata.team` not set — every skill must declare an owning team");
  if (!fm.metadata?.maintainer)
    errors.push("`metadata.maintainer` not set — every skill must declare a maintainer");
  if (!fm.metadata?.dependencies)
    errors.push("`metadata.dependencies` not set — declare dependencies or set to `None`");

  errors.forEach((e) => console.log("  ✗ " + e));
  warnings.forEach((w) => {
    console.log("  ⚠  " + w);
    console.log(`::warning file=${skillMd}::${w.replace(/`/g, "")}`);
  });

  if (errors.length) {
    anyError = true;
  } else {
    console.log("  ✓ Passes skill-schema.json validation");
    if (warnings.length)
      console.log("  ℹ  Warnings above need human review before merge (C1 checklist)");
  }

  totalWarnings += warnings.length;
  skillResults.push({ dir, errors, warnings, deprecated: false });
}

console.log("");
if (anyError) {
  console.log("❌ Validation failed — fix errors before requesting review.");
  console.log("   Reference: skill-schema.json and CONTRIBUTING.md");
} else {
  console.log("✅ Schema validation passed.");
  if (totalWarnings > 0)
    console.log("   Any ⚠ warnings require the C1–C4 checklist to be completed at review.");
}

// Write GitHub Step Summary
writeSummary("## Skill Validation Results\n");

for (const { dir, errors, warnings, deprecated } of skillResults) {
  const skillName = path.basename(dir);
  writeSummary(`### \`${skillName}\``);

  if (deprecated) {
    writeSummary("⏸ **Deprecated** — excluded from registry, validation skipped.\n");
    continue;
  }

  if (errors.length) {
    writeSummary("**Status: ❌ Failed**\n");
    writeSummary("| | Error |");
    writeSummary("|---|---|");
    errors.forEach((e) => writeSummary(`| ❌ | ${e} |`));
    writeSummary("");
  } else {
    writeSummary("**Status: ✅ Passed**\n");
  }

  if (warnings.length) {
    writeSummary("**C1 Checklist Warnings** — complete before merging:\n");
    writeSummary("| | Warning |");
    writeSummary("|---|---|");
    warnings.forEach((w) => writeSummary(`| ⚠️ | ${w} |`));
    writeSummary("");
  }
}

if (!anyError && totalWarnings === 0) {
  writeSummary("---");
  writeSummary("✅ All skills passed validation with no warnings.");
}

flushSummary();

if (anyError) process.exit(1);
