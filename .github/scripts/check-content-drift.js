#!/usr/bin/env node
// C.11 / Skill Runtime Companion S.4.5 ("repository-side change detection...
// available today with no host instrumentation"). Recomputes every skill's
// content hash and compares it against the committed baseline
// (.content-hash.json, written by validate-skill.js only on a passing PR-time
// run). Because that baseline is only ever regenerated when a PR legitimately
// passes review, a mismatch found here means the file changed without going
// through that path — a direct push bypassing review, or post-merge
// tampering — either way, exactly the drift this check exists to catch.
//
// Run against every skill (not just changed ones) by validate-skill-full.yml.
// Usage: CHANGED_DIRS="skills/foo skills/bar" node check-content-drift.js

const fs = require("fs");
const path = require("path");
const { readManifest, diffAgainstManifest } = require("./lib/content-hash");

const rawDirs = (process.env.CHANGED_DIRS || "").trim();
const dirs = rawDirs.split(/[\s\n]+/).filter(Boolean);

if (!dirs.length) {
  console.log("No skill directories to check.");
  process.exit(0);
}

let anyDrift = false;
const unmonitored = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
  const dirName = path.basename(dir);
  const stored = readManifest(dir);

  if (!stored) {
    // C.11: "Coverage is reported: which registered skills are actually
    // observed, and which are registered but unmonitored." Not a failure —
    // this skill predates the content-hash baseline, or hasn't had a
    // passing PR run since it was introduced.
    unmonitored.push(dirName);
    console.log(`ℹ ${dirName}: no baseline yet (unmonitored)`);
    continue;
  }

  const diffs = diffAgainstManifest(dir, stored);
  if (diffs.length) {
    anyDrift = true;
    console.log(`\n✗ DRIFT in ${dirName} (baseline from ${stored.computedAt}, ref ${stored.sourceRef || "n/a"}):`);
    diffs.forEach((d) => console.log(`    ${d.status}: ${d.path}`));
  } else {
    console.log(`✓ ${dirName}: content matches registered baseline`);
  }
}

if (unmonitored.length) {
  console.log(`\nℹ Unmonitored (no baseline yet): ${unmonitored.join(", ")}`);
}

if (anyDrift) {
  console.log("\n❌ Content drift detected — a skill's files changed without a corresponding passing PR run. See above.");
  process.exit(1);
}
console.log("\n✅ No content drift detected.");
