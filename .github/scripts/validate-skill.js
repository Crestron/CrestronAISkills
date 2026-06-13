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
const REPORTS_DIR = process.env.REPORTS_DIR || "reports";

function writeSummary(line) {
  summaryLines.push(line);
}

function flushSummary() {
  if (!SUMMARY_FILE) return;
  fs.appendFileSync(SUMMARY_FILE, summaryLines.join("\n") + "\n");
}

function writeReport(skillName, status, errors, warnings, deprecated, frontmatter, checks) {
  const safeName = path.basename(String(skillName)).replace(/[^a-zA-Z0-9._-]/g, "_");
  const baseDir = path.resolve(REPORTS_DIR);
  const reportDir = path.resolve(baseDir, safeName);
  if (!reportDir.startsWith(baseDir + path.sep)) throw new Error(`Unsafe report path: ${reportDir}`);
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    skill: skillName,
    validatedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    pr: process.env.GITHUB_REF || null,
    validator: "CrestronAISkills CI",
    status,
    deprecated,
    errors,
    warnings,
    checks: checks || [],
    frontmatter: frontmatter || null,
  };
  fs.writeFileSync(
    path.join(reportDir, "validation-report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(`  Report: ${reportDir}/validation-report.json`);
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

const C1_HUMAN_ITEMS = [
  "Input schema documented — all parameter types and validation rules described in skill body",
  "Output schema documented — maximum output size declared",
  "Scope constraints declared — what the skill can and cannot do is explicit",
  "Test coverage documented and meets minimum thresholds (see C3 in CONTRIBUTING.md)",
  "Approving AI Workgroup member identified and recorded",
];

let anyError = false;
let totalWarnings = 0;
const skillResults = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

  const skillMd = path.join(dir, "skill.md");
  const dirName = path.basename(dir);
  const errors = [];
  const warnings = [];
  const checks = []; // { label, passed }

  function chk(label, passed, errorMsg) {
    checks.push({ label, passed });
    if (!passed && errorMsg) errors.push(errorMsg);
    return passed;
  }

  console.log(`\n── ${dir} ──`);

  if (!fs.existsSync(skillMd)) {
    console.log("  ✗ Missing skill.md");
    anyError = true;
    writeReport(dirName, "failed", ["Missing skill.md"], [], false, null, []);
    skillResults.push({ dir, errors: ["Missing skill.md"], warnings: [], checks: [], deprecated: false });
    continue;
  }

  const content = fs.readFileSync(skillMd, "utf8");

  chk("skill.md begins with frontmatter (---)", content.startsWith("---"),
    "skill.md must begin with YAML frontmatter (---)");

  const fm = parseFrontmatter(content);

  if (fm.deprecated === "true" || fm.deprecated === true) {
    console.log("  ⏸  deprecated: true — skipped from registry, not validated");
    writeReport(dirName, "deprecated", [], [], true, fm, []);
    skillResults.push({ dir, errors: [], warnings: [], checks: [], deprecated: true });
    continue;
  }

  // name
  const nameOk = chk("name present", !!fm.name, "Missing required field: `name`");
  if (nameOk) {
    chk("name format (kebab-case, lowercase)", NAME_RE.test(fm.name),
      `\`name\` "${fm.name}" must be lowercase letters/numbers/hyphens — no leading, trailing, or consecutive hyphens`);
    chk("name ≤ 64 characters", fm.name.length <= 64,
      `\`name\` exceeds 64 characters (${fm.name.length})`);
    chk("name matches directory name", fm.name === dirName,
      `\`name\` "${fm.name}" must match directory name "${dirName}"`);
  }

  // version
  const verOk = chk("version present", !!fm.version, "Missing required field: `version`");
  if (verOk) {
    chk("version is semver (major.minor.patch)", VER_RE.test(fm.version),
      `\`version\` "${fm.version}" must be semantic version — e.g. 1.0.0`);
  }

  // description
  const descOk = chk("description present", !!fm.description, "Missing required field: `description`");
  if (descOk) {
    chk("description ≥ 10 characters", fm.description.length >= 10,
      `\`description\` too short (${fm.description.length} chars, min 10)`);
    chk("description ≤ 1024 characters", fm.description.length <= 1024,
      `\`description\` too long (${fm.description.length} chars, max 1024)`);
  }

  // tags
  const tagsOk = chk("tags present (non-empty array)", !!(fm.tags && fm.tags.length),
    "Missing required field: `tags` — must be a non-empty array, e.g. `[crestron, av]`");
  if (tagsOk) {
    const badTags = fm.tags.filter((t) => !TAG_RE.test(t));
    chk("all tags lowercase/alphanumeric", badTags.length === 0,
      badTags.map((t) => `tag "${t}" must be lowercase letters/numbers/hyphens`).join("; "));
  }

  // author
  chk("author set", !!fm.author, "Missing required field: `author`");

  // C1 — metadata (hard required)
  chk("metadata.team set", !!fm.metadata?.team,
    "`metadata.team` not set — every skill must declare an owning team");
  chk("metadata.maintainer set", !!fm.metadata?.maintainer,
    "`metadata.maintainer` not set — every skill must declare a maintainer");
  chk("metadata.dependencies set", !!fm.metadata?.dependencies,
    "`metadata.dependencies` not set — declare dependencies or set to `None`");

  errors.forEach((e) => console.log("  ✗ " + e));
  warnings.forEach((w) => console.log("  ⚠  " + w));

  if (errors.length) {
    anyError = true;
    writeReport(dirName, "failed", errors, warnings, false, fm, checks);
  } else {
    console.log("  ✓ Passes skill-schema.json validation");
    if (warnings.length)
      console.log("  ℹ  Warnings above need human review before merge (C1 checklist)");
    writeReport(dirName, "passed", [], warnings, false, fm, checks);
  }

  totalWarnings += warnings.length;
  skillResults.push({ dir, errors, warnings, checks, deprecated: false });
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

for (const { dir, errors, warnings, checks, deprecated } of skillResults) {
  const skillName = path.basename(dir);
  writeSummary(`### \`${skillName}\``);

  if (deprecated) {
    writeSummary("⏸ **Deprecated** — excluded from registry, validation skipped.\n");
    continue;
  }

  writeSummary(errors.length ? "**Status: ❌ Failed**\n" : "**Status: ✅ Passed**\n");

  if (errors.length) {
    writeSummary("| | Error |");
    writeSummary("|---|---|");
    errors.forEach((e) => writeSummary(`| ❌ | ${e} |`));
    writeSummary("");
  }

  if (warnings.length) {
    writeSummary("**C1 Checklist Warnings** — complete before merging:\n");
    writeSummary("| | Warning |");
    writeSummary("|---|---|");
    warnings.forEach((w) => writeSummary(`| ⚠️ | ${w} |`));
    writeSummary("");
  }

  // CI checks detail table
  if (checks.length) {
    writeSummary("<details><summary>CI checks detail</summary>\n");
    writeSummary("| Result | Check |");
    writeSummary("|---|---|");
    checks.forEach(({ label, passed }) =>
      writeSummary(`| ${passed ? "✅" : "❌"} | ${label} |`)
    );
    writeSummary("\n</details>\n");
  }

  // Human review checklist
  writeSummary("**C1 — Reviewer: human review required**\n");
  writeSummary("| | Item | Policy |");
  writeSummary("|---|---|---|");
  C1_HUMAN_ITEMS.forEach((item) => writeSummary(`| ☐ | ${item} | 6.1 |`));
  writeSummary("");
  writeSummary(
    "> **C2 / C3 / C4** — Complete for MAJOR and MINOR version changes. " +
    "See the [Skill Approval Checklist](../blob/main/CONTRIBUTING.md#skill-approval-checklist).\n"
  );
}

if (!anyError && totalWarnings === 0) {
  writeSummary("---");
  writeSummary("✅ All skills passed CI validation. Reviewer checklist above requires human sign-off before merge.");
}

flushSummary();

if (anyError) process.exit(1);
