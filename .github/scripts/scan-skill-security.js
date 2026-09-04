#!/usr/bin/env node
// Static safety/security scan for changed skills, separate from schema validation
// (validate-skill.js) so the two can be reasoned about and fail independently.
//
// Passes per changed skill:
//  1. Dangerous-command scan of bundled scripts (.ps1/.sh/.py/.js) — any match not
//     listed in metadata.destructive-operations is a blocking error (C2/C6:
//     undeclared destructive operations).
//  2. Prompt-injection content scan of the skill.md body itself — skill files are
//     loaded verbatim into another agent's context by registry consumers, so this
//     is the literal OWASP LLM01 risk cited in the compliance checklist.
//  3. Self-modification scan (blocking, always — not coverable by declaration):
//     a script that writes to its own path, or any script/body content that
//     writes to a governance file (skill-schema.json, the validator/scanner
//     scripts, workflow files, CODEOWNERS). A skill must never be able to modify
//     the checks that validate it.
//  4. General mutating-command scan (non-blocking warning): file writes, mutating
//     HTTP verbs, git writes, env/registry changes, package installs. Lower
//     severity than the destructive-op list — surfaced for human review, not
//     declaration-gated.
//  5. C.5.3 instruction-content bans on the body: approval-bypass language,
//     privilege-escalation/identity-assumption language, live-URL-as-
//     instruction-source, and environment/toolchain-modification language.
//     Always blocking — these are C.13.2 automatic-rejection conditions.
//  6. C.5.3.7 internal hostname/private IP (blocking) and possible PII email
//     addresses (warning) in the body.
//  7. C.8.3 credential-store/SSH-key/shell-history/env-file access in
//     bundled scripts. Always blocking, like self-modification.
//
// Usage: CHANGED_DIRS="skills/foo skills/bar" node scan-skill-security.js

const fs = require("fs");
const path = require("path");
const { parseFrontmatter, listFilesRecursive, SCRIPT_EXTENSIONS } = require("./lib/skill-frontmatter");

const REPORTS_DIR = process.env.REPORTS_DIR || "reports";
const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY || null;
const summaryLines = [];

// Each pattern is matched independently per-file. `keywords` is what gets
// cross-checked against metadata.destructive-operations: a finding only counts as
// "declared" if the declaration text mentions the script's own filename OR at least
// one of these keywords — not just *any* non-trivial declaration (that would let
// declaring "deletes files" silently also cover an unrelated `eval()` call).
const DANGEROUS_PATTERNS = [
  { label: "force file/recursive deletion", keywords: ["delet", "remove", "rm "], re: /\bRemove-Item\s+[^\n]*-Force\b|\brm\s+-\w*[rf]\w*/i },
  { label: "dynamic code execution", keywords: ["eval", "exec", "invoke-expression", "iex"], re: /\bInvoke-Expression\b|\biex\s+[\$"']|(?<![\w.])eval\(|(?<![\w.])exec\(/i },
  { label: "shell=True subprocess call", keywords: ["subprocess", "shell"], re: /subprocess\.\w+\([^)]*shell\s*=\s*True/i },
  { label: "pipe remote script to a shell", keywords: ["curl", "pipe", "iwr"], re: /curl[^\n|]*\|\s*(sh|bash|pwsh)\b|iwr[^\n|]*\|\s*iex\b/i },
  { label: "destructive disk/volume operation", keywords: ["format", "mkfs", "volume", "disk"], re: /\bFormat-Volume\b|\bmkfs\.\w+/i },
  { label: "process termination", keywords: ["kill", "stop-process", "process"], re: /\bStop-Process\b|\bkill\s+-9\b/i },
  { label: "destructive SQL", keywords: ["drop table", "drop database", "truncate", "sql"], re: /\bDROP\s+(TABLE|DATABASE)\b|\bTRUNCATE\s+TABLE\b/i },
  { label: "force-push / history rewrite", keywords: ["force-push", "force push", "reset --hard", "history rewrite"], re: /\bgit\s+push\s+[^\n]*--force\b|\bgit\s+reset\s+--hard\b/i },
];

// Signals that skill.md content (loaded verbatim into another agent's context by
// registry consumers) might be smuggling instructions rather than documenting them.
const INJECTION_SIGNALS = [
  { label: "zero-width/invisible Unicode characters", re: /[​-‏‪-‮⁠-⁤﻿]/ },
  { label: "embedded <script> tag", re: /<script\b/i },
  { label: "imperative override language inside an HTML comment", re: /<!--[\s\S]*?\b(ignore|disregard|override)\b[\s\S]*?(previous|system|instructions?)[\s\S]*?-->/i },
  { label: "long base64-looking blob (possible smuggled payload)", re: /[A-Za-z0-9+/]{200,}={0,2}(?!\S)/ },
];

// A file "writes" something if it contains any of these operations, regardless of
// language. Used both by the self-modification check (combined with a self- or
// governance-file reference) and reused as the trigger set for the mutating-command
// warning tier below.
const WRITE_OP_RE = /\bSet-Content\b|\bOut-File\b|\[System\.IO\.File\]::Write\w*|New-Item\b[^\n]*-Force|open\([^)]*['"]a?w[b']?['"]|\.writeFileSync\(|fs\.(write|append)\w*\(|\bsed\s+-i\b/i;

// Self-reference tokens, per script language — a script that reads its own path.
const SELF_REFERENCE_RE = {
  ".ps1": /\$PSCommandPath\b|\$MyInvocation\.MyCommand\.(Path|Definition)\b/,
  ".py": /__file__\b/,
  ".sh": /\$0\b|\$\{?BASH_SOURCE\}?/,
  ".js": /__filename\b|import\.meta\.url\b/,
};

// Governance files a skill must never be able to modify — the checks that
// validate it. Matched against both bundled scripts and the skill.md body.
const GOVERNANCE_FILE_RE = /\bskill-schema\.json\b|\bvalidate-skill\.js\b|\bscan-skill-security\.js\b|\brun-skill-tests\.js\b|\bbuild-registry\.js\b|\.github[\\/]workflows[\\/]|\bCODEOWNERS\b/i;

// C.5.3 instruction-content bans, checked against the skill.md body. Always
// blocking, never declaration-gated — these are categorically the properties
// C.13.2 lists as automatic-rejection conditions, not judgment calls a
// maintainer could knowingly accept.
const BODY_BAN_PATTERNS = [
  {
    label: "instructs bypassing an approval gate, review step, or guardrail (C.5.3.1)",
    re: /\b(bypass|skip|disable|suppress|circumvent|work[\s-]?around)\b[^\n]{0,40}\b(approval|review|codeowners|guardrail|gate)\b|\b(approval|review|codeowners|guardrail|gate)\b[^\n]{0,40}\b(bypass|skip|disable|suppress|circumvent)\b/i,
  },
  {
    label: "instructs escalating privilege, assuming an identity, or reusing credentials outside scope (C.5.3.2)",
    re: /\b(assume|escalate|elevate)\b[^\n]{0,40}\b(privilege|role|identity|permission)\b|\brun\s+as\s+(admin(?:istrator)?|root)\b|\bsudo\b|\buse\s+admin(?:istrator)?\s+credentials\b|\bimpersonat\w*/i,
  },
  {
    label: "instructs fetching further instructions from a live/mutable URL at runtime (C.5.3.3)",
    re: /\b(fetch|load|retrieve|download|pull|read)\b[^\n]{0,60}https?:\/\/\S+[^\n]{0,60}\b(instructions?|steps?|prompts?|commands?)\b|https?:\/\/\S+[^\n]{0,60}\bcontains?\s+(further|additional|the)?\s*instructions?\b/i,
  },
  {
    label: "instructs installing packages or modifying environment/toolchain config (C.5.3.4)",
    re: /\b(install|modify|change|alter)\b[^\n]{0,40}\b(PATH\b|environment variable|toolchain|global config|system config)/i,
  },
];

// C.5.3.7 — internal hostnames / private IP ranges. Blocking (unlike the
// email/PII check below): a mechanically distinctive signal of internal
// infrastructure exposure with low false-positive risk, unlike a public
// company domain reference.
const INTERNAL_HOSTNAME_RE = /\b(?:[\w-]+\.)*(?:internal|corp|vpn|intranet)\.[\w.-]+\b|\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/i;

// C.5.3.7 — possible PII. Kept as a warning, not a blocking error: an email
// pattern has real false-positive risk (a legitimate "contact
// support@crestron.com" reference), unlike the hostname/IP check above.
const PII_EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// C.8.3 — a skill must never read credential stores, SSH keys, shell
// history, or environment files. Checked against bundled scripts, blocking
// and always, same tier as self-modification: this "escalates immediately,
// at any tier" per the Runtime Companion doc's response matrix (S.6.4).
const CREDENTIAL_STORE_ACCESS_RE = /~[\/\\]\.ssh\b|\bid_rsa\b|\bid_ed25519\b|\.aws[\/\\]credentials\b|\.netrc\b|\.bash_history\b|\.zsh_history\b|USERPROFILE[^\n]{0,20}\.ssh\b/i;

// Non-destructive but still state-changing operations. Lower severity than
// DANGEROUS_PATTERNS — surfaced as a warning for human review, not gated behind a
// metadata declaration (too broad/common to require declaring every file write).
const MUTATING_PATTERNS = [
  { label: "file write", re: WRITE_OP_RE },
  { label: "mutating HTTP call (POST/PUT/PATCH/DELETE)", re: /Invoke-(WebRequest|RestMethod)\b[^\n]*-Method\s+['"]?(Post|Put|Patch|Delete)|requests\.(post|put|patch|delete)\(|fetch\([^)]*method\s*:\s*['"](POST|PUT|PATCH|DELETE)/i },
  { label: "git write operation", re: /\bgit\s+(commit|add|push)\b(?!\s+[^\n]*--force)/i },
  { label: "environment/registry mutation", re: /\bSet-ItemProperty\b|\bNew-ItemProperty\b|\bsetx\s|SetEnvironmentVariable\(/i },
  { label: "package install", re: /\bnpm\s+(install|ci)\b|\bpip\s+install\b|\bInstall-Module\b/i },
];

function writeSummary(line) {
  summaryLines.push(line);
}

function flushSummary() {
  if (!SUMMARY_FILE) return;
  fs.appendFileSync(SUMMARY_FILE, summaryLines.join("\n") + "\n");
}

// Returns the declared-operations text (lowercased) for keyword matching, or null
// if nothing non-trivial is declared at all.
function declaredText(fm) {
  const list = fm?.metadata?.["destructive-operations"];
  if (!Array.isArray(list) || list.length === 0) return null;
  if (list.length === 1 && /^none$/i.test(list[0])) return null;
  return list.join(" ").toLowerCase();
}

// A finding is "covered" only if the declaration mentions the script's own
// filename or one of the pattern's keywords — not just any non-trivial
// declaration (that would let declaring "deletes files" also silently cover an
// unrelated eval()/Invoke-Expression call in the same skill).
function isCovered(declared, scriptFile, pattern) {
  if (!declared) return false;
  const basename = path.basename(scriptFile).toLowerCase();
  if (declared.includes(basename)) return true;
  return pattern.keywords.some((k) => declared.includes(k));
}

const rawDirs = (process.env.CHANGED_DIRS || "").trim();
const dirs = rawDirs.split(/[\s\n]+/).filter(Boolean);

if (!dirs.length) {
  console.log("No skill directories changed.");
  process.exit(0);
}

let anyError = false;
const skillResults = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

  const dirName = path.basename(dir);
  const skillMd = path.join(dir, "skill.md");
  const findings = [];
  const warnings = [];

  console.log(`\n── ${dir} (security scan) ──`);

  if (!fs.existsSync(skillMd)) continue; // validate-skill.js already reports this

  const content = fs.readFileSync(skillMd, "utf8");
  const { fm, body, malformed } = parseFrontmatter(content);
  if (malformed || fm?.deprecated === true) continue; // already reported/skipped elsewhere

  const declared = declaredText(fm);

  // Pass 1: dangerous patterns in bundled scripts, plus self-modification and
  // mutating-command checks on the same files.
  for (const file of listFilesRecursive(dir)) {
    const ext = path.extname(file);
    if (!SCRIPT_EXTENSIONS.includes(ext)) continue;
    const scriptContent = fs.readFileSync(file, "utf8");

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.re.test(scriptContent) && !isCovered(declared, file, pattern)) {
        findings.push(
          `Undeclared destructive operation in \`${file}\`: ${pattern.label}. Add it to ` +
          `\`metadata.destructive-operations\` (mentioning the filename or the operation type) ` +
          `or remove the pattern if unintended.`
        );
      }
    }

    // Self-modification: never coverable by a declaration — a skill must not be
    // able to rewrite its own script or the files that validate it.
    const selfRefRe = SELF_REFERENCE_RE[ext];
    if (selfRefRe && selfRefRe.test(scriptContent) && WRITE_OP_RE.test(scriptContent)) {
      findings.push(
        `\`${file}\` references its own path (self-modifying code pattern) alongside a ` +
        `write operation. This always requires review regardless of ` +
        `\`metadata.destructive-operations\`.`
      );
    }
    if (GOVERNANCE_FILE_RE.test(scriptContent) && WRITE_OP_RE.test(scriptContent)) {
      findings.push(
        `\`${file}\` references a governance/CI file (schema, validator, workflow, or ` +
        `CODEOWNERS) alongside a write operation. A skill must never modify the checks ` +
        `that validate it.`
      );
    }

    // Mutating commands: lower severity, always surfaced, never declaration-gated.
    for (const pattern of MUTATING_PATTERNS) {
      if (pattern.re.test(scriptContent)) {
        warnings.push(`\`${file}\` contains a mutating command: ${pattern.label} — review before approving.`);
      }
    }

    // C.8.3 — credential-store/SSH-key/shell-history/env-file access, in
    // bundled scripts. Always blocking, never declaration-gated.
    if (CREDENTIAL_STORE_ACCESS_RE.test(scriptContent)) {
      findings.push(`\`${file}\` references a credential store, SSH key, or shell-history/env file (C.8.3) — a skill must never read these, at any tier.`);
    }
  }

  // Pass 2: prompt-injection and governance-edit-instruction signals in the
  // skill.md body itself.
  if (body) {
    for (const { label, re } of INJECTION_SIGNALS) {
      if (re.test(body)) {
        findings.push(
          `\`skill.md\` body contains a possible prompt-injection signal: ${label}. ` +
          `This file is loaded verbatim into other agents' context — remove it or ` +
          `confirm it's a legitimate example (e.g. inside a fenced code block) before merging.`
        );
      }
    }
    if (GOVERNANCE_FILE_RE.test(body) && WRITE_OP_RE.test(body)) {
      findings.push(
        "`skill.md` body instructs editing a governance/CI file (schema, validator, " +
        "workflow, or CODEOWNERS) alongside a write operation. A skill's instructions " +
        "must never tell an agent to modify the checks that validate it."
      );
    }

    // C.5.3 instruction-content bans — always blocking.
    for (const { label, re } of BODY_BAN_PATTERNS) {
      if (re.test(body)) {
        findings.push(`\`skill.md\` body ${label}.`);
      }
    }

    // C.5.3.7 — internal hostnames/private IPs (blocking) and possible PII
    // email addresses (warning — higher false-positive risk).
    if (INTERNAL_HOSTNAME_RE.test(body)) {
      findings.push("`skill.md` body references an internal hostname or private IP address (C.5.3.7) — remove it or confirm it's a placeholder/example, not a real internal address.");
    }
    if (PII_EMAIL_RE.test(body)) {
      warnings.push("`skill.md` body contains what looks like an email address — confirm it isn't PII/customer data (C.5.3.7) before approving.");
    }
  }

  findings.forEach((f) => console.log("  ✗ " + f));
  warnings.forEach((w) => console.log("  ⚠  " + w));
  if (!findings.length && !warnings.length) {
    console.log("  ✓ No dangerous patterns, self-modification, or prompt-injection signals found");
  }

  if (findings.length) anyError = true;
  skillResults.push({ dir: dirName, findings, warnings });

  // Merge into the same per-skill report validate-skill.js writes, under a
  // `security` sub-key, instead of a second competing report file.
  const reportPath = path.resolve(REPORTS_DIR, dirName, "validation-report.json");
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    report.security = { scannedAt: new Date().toISOString(), findings, warnings };
    if (findings.length) report.status = "failed";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  }
}

console.log("");
writeSummary("## Skill Security Scan Results\n");
for (const { dir, findings, warnings } of skillResults) {
  writeSummary(`### \`${dir}\``);
  if (findings.length) {
    writeSummary("**Status: ❌ Failed**\n");
    writeSummary("| | Finding |");
    writeSummary("|---|---|");
    findings.forEach((f) => writeSummary(`| ❌ | ${f} |`));
    writeSummary("");
  } else {
    writeSummary("**Status: ✅ No blocking findings**\n");
  }
  if (warnings.length) {
    writeSummary("**Mutating-command warnings** — review before approving, not blocking:\n");
    writeSummary("| | Warning |");
    writeSummary("|---|---|");
    warnings.forEach((w) => writeSummary(`| ⚠️ | ${w} |`));
    writeSummary("");
  }
}
flushSummary();

if (anyError) {
  console.log("❌ Security scan failed — see findings above.");
  process.exit(1);
}
console.log("✅ Security scan passed.");
