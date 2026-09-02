#!/usr/bin/env node
// Validates changed skill directories against skill-schema.json (single source of
// truth, loaded via ajv) plus checks that skill-schema.json cannot express on its
// own: directory-name match, copilot-skills/ mirror drift, frontmatter well-formedness,
// version-must-increase, and deprecation-notice date math.
// Usage: CHANGED_DIRS="skills/foo skills/bar" [BASE_REF=main] node validate-skill.js

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { parseFrontmatter, hasBundledScripts } = require("./lib/skill-frontmatter");

const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY || null;
const summaryLines = [];
const REPORTS_DIR = process.env.REPORTS_DIR || "reports";
const BASE_REF = process.env.BASE_REF || null;

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "skill-schema.json"), "utf8")
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function writeSummary(line) {
  summaryLines.push(line);
}

function flushSummary() {
  if (!SUMMARY_FILE) return;
  fs.appendFileSync(SUMMARY_FILE, summaryLines.join("\n") + "\n");
}

function writeReport(skillName, status, errors, warnings, deprecated, frontmatter) {
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
    frontmatter: frontmatter || null,
  };
  fs.writeFileSync(
    path.join(reportDir, "validation-report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(`  Report: ${reportDir}/validation-report.json`);
}

function ajvErrorsToMessages(errors) {
  return (errors || []).map((e) => {
    const loc = e.instancePath ? e.instancePath.replace(/^\//, "").replace(/\//g, ".") : "(root)";
    return `\`${loc}\` ${e.message}${e.params && e.params.allowedValues ? ` (allowed: ${e.params.allowedValues.join(", ")})` : ""}`;
  });
}

function readFileAtRef(ref, relPath) {
  try {
    return execFileSync("git", ["show", `${ref}:${relPath}`], { encoding: "utf8" });
  } catch {
    return null; // file didn't exist at that ref (new skill) — not an error here
  }
}

function versionParts(v) {
  return String(v).split(".").map(Number);
}

function versionGreater(a, b) {
  const [a1, a2, a3] = versionParts(a);
  const [b1, b2, b3] = versionParts(b);
  if (a1 !== b1) return a1 > b1;
  if (a2 !== b2) return a2 > b2;
  return a3 > b3;
}

function daysBetween(isoA, isoB) {
  return Math.round((new Date(isoB) - new Date(isoA)) / 86400000);
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
    writeReport(dirName, "failed", ["Missing skill.md"], [], false, null);
    skillResults.push({ dir, errors: ["Missing skill.md"], warnings: [], deprecated: false });
    continue;
  }

  const content = fs.readFileSync(skillMd, "utf8");
  const { fm, body, malformed } = parseFrontmatter(content);

  if (malformed) {
    errors.push(`skill.md frontmatter is malformed: ${malformed}`);
    anyError = true;
    writeReport(dirName, "failed", errors, [], false, null);
    skillResults.push({ dir, errors, warnings: [], deprecated: false });
    continue;
  }

  if (fm.deprecated === true) {
    console.log("  ⏸  deprecated: true — skipped from registry, not validated");
    writeReport(dirName, "deprecated", [], [], true, fm);
    skillResults.push({ dir, errors: [], warnings: [], deprecated: true });
    continue;
  }

  // Schema validation — single source of truth, replaces the old hand-rolled
  // NAME_RE/VER_RE/TAG_RE regex checks that used to drift from skill-schema.json.
  if (!validateSchema(fm)) {
    errors.push(...ajvErrorsToMessages(validateSchema.errors));
  }

  // Checks skill-schema.json structurally cannot express:
  if (fm.name && fm.name !== dirName) {
    errors.push(`\`name\` "${fm.name}" must match directory name "${dirName}"`);
  }

  if (body !== null && fm.metadata && Array.isArray(fm.metadata["scope-allow"])) {
    if (!/^##\s+Scope\b/im.test(body)) {
      errors.push("Declared `metadata.scope-allow`/`scope-deny` but body has no `## Scope` section explaining them");
    }
  }

  // C3 — a skill that ships executable code can't dodge automated testing on the
  // risky part by declaring the whole skill "manual".
  if (fm.metadata && fm.metadata["test-strategy"] === "manual" && hasBundledScripts(dir)) {
    errors.push("`metadata.test-strategy: manual` is not allowed — this skill bundles executable scripts, so `automated` or `hybrid` is required");
  }

  // C4 — copilot-skills/<name>/SKILL.md must mirror skills/<name>/skill.md exactly.
  const mirrorPath = path.join("copilot-skills", dirName, "SKILL.md");
  if (fs.existsSync(mirrorPath)) {
    const mirrorContent = fs.readFileSync(mirrorPath, "utf8").replace(/\r\n/g, "\n");
    const normalized = content.replace(/\r\n/g, "\n");
    if (mirrorContent !== normalized) {
      errors.push(`\`${mirrorPath}\` has drifted from \`${skillMd}\` — keep both copies identical`);
    }
  } else {
    warnings.push(`No \`${mirrorPath}\` mirror found — Copilot CLI/VS Code users won't see this skill until one is added`);
  }

  // C4 — version must strictly increase vs. base branch whenever the file changed.
  if (BASE_REF && fm.version) {
    const baseContent = readFileAtRef(`origin/${BASE_REF}`, skillMd.replace(/\\/g, "/"));
    if (baseContent && baseContent !== content) {
      const basefm = parseFrontmatter(baseContent).fm;
      if (basefm && basefm.version && !versionGreater(fm.version, basefm.version)) {
        errors.push(`\`version\` must increase on any change — was "${basefm.version}", still "${fm.version}"`);
      }
    }
  }

  // C4 — deprecation requires >= 60 days notice before removal.
  if (fm.metadata && fm.metadata["deprecation-notice-date"] && fm.metadata["removal-date"]) {
    const gap = daysBetween(fm.metadata["deprecation-notice-date"], fm.metadata["removal-date"]);
    if (Number.isNaN(gap) || gap < 60) {
      errors.push(`\`metadata.removal-date\` must be at least 60 days after \`metadata.deprecation-notice-date\` (got ${Number.isNaN(gap) ? "invalid dates" : gap + " days"})`);
    }
  }

  // C2 single-responsibility — a judgment call, not mechanically decidable, so it
  // stays a warning for human review rather than a blocking error.
  if (fm.description && (fm.description.match(/\band\b/gi) || []).length >= 3) {
    warnings.push("Description mentions \"and\" 3+ times — review for single-responsibility (C2.1) before approving");
  }

  errors.forEach((e) => console.log("  ✗ " + e));
  warnings.forEach((w) => console.log("  ⚠  " + w));

  if (errors.length) {
    anyError = true;
    writeReport(dirName, "failed", errors, warnings, false, fm);
  } else {
    console.log("  ✓ Passes skill-schema.json validation");
    if (warnings.length)
      console.log("  ℹ  Warnings above need human review before merge (C1–C6 checklist)");
    writeReport(dirName, "passed", [], warnings, false, fm);
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
    console.log("   Any ⚠ warnings require the C1–C6 checklist to be completed at review.");
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
    writeSummary("**C1–C6 Checklist Warnings** — complete before merging:\n");
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
