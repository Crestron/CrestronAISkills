#!/usr/bin/env node
// Thin CLI wrapper around lib/sync-skill.js — copies a skill from a checked-out
// source repo into skills/<TARGET_NAME>/, stamping provenance metadata, and
// updates the copilot-skills/ mirror. Invoked by .github/workflows/sync-skill.yml.
//
// Required env vars:
//   SOURCE_DIR    - path to the checked-out source repo (e.g. "_source")
//   SOURCE_PATH   - path within the source repo to the skill's directory
//   TARGET_NAME   - skill name in this repo (skills/<TARGET_NAME>/)
//   SOURCE_REPO   - "owner/repo" of the source, recorded as provenance
//   SOURCE_REF    - commit SHA or tag synced from, recorded as provenance

const path = require("path");
const { syncSkill } = require("./lib/sync-skill");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const sourceDir = requireEnv("SOURCE_DIR");
const sourcePath = requireEnv("SOURCE_PATH");
const targetName = requireEnv("TARGET_NAME");
const sourceRepo = requireEnv("SOURCE_REPO");
const sourceRef = requireEnv("SOURCE_REF");

const targetSkillDir = path.join("skills", targetName);
const mirrorDir = path.join("copilot-skills", targetName);

try {
  const { isNewSkill } = syncSkill({
    sourceRepoRoot: sourceDir,
    sourcePath,
    targetSkillDir,
    mirrorDir,
    provenance: {
      sourceRepo: `https://github.com/${sourceRepo}`,
      sourceRef,
      sourcePath,
      syncedAt: new Date().toISOString(),
    },
  });

  console.log(`✅ Synced ${sourceRepo}@${sourceRef}:${sourcePath} -> skills/${targetName}/`);
  if (isNewSkill) {
    console.log(
      "   New skill — Crestron compliance metadata (scope-allow, test-strategy, " +
      "approved-by, etc.) is not yet set. validate-skill.js will list what's " +
      "missing; fill it in on this PR before merging."
    );
  }
} catch (err) {
  console.error(`❌ Sync failed: ${err.message}`);
  process.exit(1);
}
