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
const { writeManifest } = require("./lib/content-hash");

const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY || null;
const summaryLines = [];
const REPORTS_DIR = process.env.REPORTS_DIR || "reports";
const BASE_REF = process.env.BASE_REF || null;
const HEAD_REF = process.env.HEAD_REF || null;
// Only the PR-time workflow (validate-skill.yml) sets this. The read-only
// scheduled scan (validate-skill-full.yml) must NEVER regenerate the
// baseline it's comparing against in the same run — that would make drift
// undetectable by construction (recomputing the hash from current content
// right before comparing it to itself always finds "no drift").
const UPDATE_CONTENT_HASH = process.env.UPDATE_CONTENT_HASH === "true";

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

  // C.2.1 trigger declarations must match reality, not just be self-consistent
  // per the schema — the same "can't dodge by declaring" pattern as above.
  if (fm.metadata) {
    const hasScripts = hasBundledScripts(dir);
    if (fm.metadata["trigger-code"] === false && hasScripts) {
      errors.push("`metadata.trigger-code: false` but this skill bundles executable scripts (T-CODE must be true)");
    }
    if (fm.metadata["trigger-code"] === true && !hasScripts) {
      warnings.push("`metadata.trigger-code: true` but no bundled scripts were found — confirm this is forward-looking, not stale");
    }
    // C.9 — T-EXT must track metadata.source-repo, not be declared independently
    // of it: a synced skill is external by construction, and a skill claiming
    // external provenance without source-repo needs a publisher instead
    // (enforced by the schema's anyOf; this catches the opposite mismatch).
    if (fm.metadata["trigger-ext"] === false && fm.metadata["source-repo"]) {
      errors.push("`metadata.trigger-ext: false` but `metadata.source-repo` is set — a synced skill is external by definition (T-EXT must be true)");
    }
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
  // Also fetches the base-branch frontmatter for the sync-lock check below.
  // Line endings are normalized before comparing — `git show` returns the raw
  // stored blob (LF) while a local checkout may have core.autocrlf rewriting to
  // CRLF, which would otherwise look like a content change when there isn't one.
  let baseFm = null;
  if (BASE_REF) {
    const baseContent = readFileAtRef(`origin/${BASE_REF}`, skillMd.replace(/\\/g, "/"));
    if (baseContent) {
      baseFm = parseFrontmatter(baseContent).fm;
      const changed = baseContent.replace(/\r\n/g, "\n") !== content.replace(/\r\n/g, "\n");
      if (fm.version && changed && baseFm && baseFm.version && !versionGreater(fm.version, baseFm.version)) {
        errors.push(`\`version\` must increase on any change — was "${baseFm.version}", still "${fm.version}"`);
      }
    }
  }

  // Sync-lock policy: once a skill has metadata.source-repo set (it's mirrored
  // from a team's own repo), edits should come from the sync workflow — which
  // always pushes to a sync/<name> branch — not a hand-edited PR that will just
  // be overwritten by the next sync. A warning, not a hard error: a human can
  // still make a deliberate, reviewed override if they must.
  if (baseFm?.metadata?.["source-repo"] && HEAD_REF && !HEAD_REF.startsWith("sync/")) {
    warnings.push(
      `This skill is synced from ${baseFm.metadata["source-repo"]} — edits made directly ` +
      `here will be overwritten by the next sync. Edit the source repo instead, or confirm ` +
      `this is an intentional, reviewed override before merging.`
    );
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

    // C.5.1.3 content-hash baseline — only ever (re)written for a skill that
    // just passed with zero errors, and only in the PR-time workflow. This
    // becomes the reference the weekly scan's drift check compares against.
    if (UPDATE_CONTENT_HASH) {
      writeManifest(dir, { skill: fm.name, version: fm.version, sourceRef: fm.metadata?.["source-ref"] });
      console.log(`  ✓ Content-hash baseline updated: ${path.join(dir, ".content-hash.json")}`);
    }
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
