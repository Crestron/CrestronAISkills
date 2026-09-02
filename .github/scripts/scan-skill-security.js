#!/usr/bin/env node
// Static safety/security scan for changed skills, separate from schema validation
// (validate-skill.js) so the two can be reasoned about and fail independently.
//
// Two passes per changed skill:
//  1. Dangerous-command scan of bundled scripts (.ps1/.sh/.py/.js) — any match not
//     listed in metadata.destructive-operations is a blocking error (C2/C6:
//     undeclared destructive operations).
//  2. Prompt-injection content scan of the skill.md body itself — skill files are
//     loaded verbatim into another agent's context by registry consumers, so this
//     is the literal OWASP LLM01 risk cited in the compliance checklist.
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

  console.log(`\n── ${dir} (security scan) ──`);

  if (!fs.existsSync(skillMd)) continue; // validate-skill.js already reports this

  const content = fs.readFileSync(skillMd, "utf8");
  const { fm, body, malformed } = parseFrontmatter(content);
  if (malformed || fm?.deprecated === true) continue; // already reported/skipped elsewhere

  const declared = declaredText(fm);

  // Pass 1: dangerous patterns in bundled scripts.
  for (const file of listFilesRecursive(dir)) {
    if (!SCRIPT_EXTENSIONS.includes(path.extname(file))) continue;
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
  }

  // Pass 2: prompt-injection smuggling signals in the skill.md body.
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
  }

  findings.forEach((f) => console.log("  ✗ " + f));
  if (!findings.length) {
    console.log("  ✓ No dangerous patterns or prompt-injection signals found");
  }

  if (findings.length) anyError = true;
  skillResults.push({ dir: dirName, findings });

  // Merge into the same per-skill report validate-skill.js writes, under a
  // `security` sub-key, instead of a second competing report file.
  const reportPath = path.resolve(REPORTS_DIR, dirName, "validation-report.json");
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    report.security = { scannedAt: new Date().toISOString(), findings };
    if (findings.length) report.status = "failed";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  }
}

console.log("");
writeSummary("## Skill Security Scan Results\n");
for (const { dir, findings } of skillResults) {
  writeSummary(`### \`${dir}\``);
  if (findings.length) {
    writeSummary("**Status: ❌ Failed**\n");
    writeSummary("| | Finding |");
    writeSummary("|---|---|");
    findings.forEach((f) => writeSummary(`| ❌ | ${f} |`));
    writeSummary("");
  } else {
    writeSummary("**Status: ✅ No findings**\n");
  }
}
flushSummary();

if (anyError) {
  console.log("❌ Security scan failed — see findings above.");
  process.exit(1);
}
console.log("✅ Security scan passed.");
