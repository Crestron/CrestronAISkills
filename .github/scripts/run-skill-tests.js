#!/usr/bin/env node
// C.12 checklist enforcement — per-skill, per-language test matrix, plus the
// structured eval log every skill needs regardless of test-strategy.
// - Every skill needs a non-empty tests/evals.md with Set A entries (X1-X4:
//   activation, false-activation, behavioral, instruction-injection eval).
//   T2/T3 skills also need Set B (X5-X7: scope-boundary/guardrail-conflict/
//   sandbox eval); T3 skills also need Set C (X11-X12: idempotency/scope-
//   boundary tests). X8-X10 are the script coverage/test-file matrix below
//   (already the per-language enforcement); X13-X16 stay out of scope —
//   they're runtime/agent properties, not something a skill file can prove.
// - test-strategy: automated/hybrid -> for every bundled script, require a matching
//   test file and run the matching language's runner; fail on missing test file,
//   any test failure, or (Pester/pytest only) file coverage below COVERAGE_THRESHOLD.
//   Bash/.sh has no numeric coverage gate — see CONTRIBUTING.md for the documented
//   carve-out (bats has no line-coverage tool that's viable in a CI container).
//
// Usage: CHANGED_DIRS="skills/foo skills/bar" node run-skill-tests.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { parseFrontmatter, listFilesRecursive } = require("./lib/skill-frontmatter");

const COVERAGE_THRESHOLD = 90;

function fail(msg) {
  console.log("  ✗ " + msg);
  return msg;
}

function testFileFor(scriptFile) {
  const dir = path.dirname(path.dirname(scriptFile)); // .../<skill>/assets/scripts/x.ps1 -> .../<skill>
  const base = path.basename(scriptFile, path.extname(scriptFile));
  const ext = path.extname(scriptFile);
  if (ext === ".ps1") return path.join(dir, "..", "tests", `${base}.Tests.ps1`);
  if (ext === ".py") return path.join(dir, "..", "tests", `test_${base}.py`);
  if (ext === ".sh") return path.join(dir, "..", "tests", `${base}.bats`);
  if (ext === ".js") return path.join(dir, "..", "tests", `${base}.test.js`);
  return null;
}

function runPester(skillDir, scripts) {
  const tmp = path.join(os.tmpdir(), `pester-${Date.now()}.json`);
  const coverageOut = path.join(os.tmpdir(), `pester-coverage-${Date.now()}.xml`);
  const cmd = [
    "Import-Module Pester -MinimumVersion 5.0;",
    "$config = New-PesterConfiguration;",
    `$config.Run.Path = '${path.join(skillDir, "tests").replace(/\\/g, "/")}';`,
    "$config.Run.PassThru = $true;",
    "$config.CodeCoverage.Enabled = $true;",
    `$config.CodeCoverage.Path = @(${scripts.map((s) => `'${s.replace(/\\/g, "/")}'`).join(",")});`,
    `$config.CodeCoverage.OutputPath = '${coverageOut.replace(/\\/g, "/")}';`,
    "$config.Output.Verbosity = 'Normal';",
    "$r = Invoke-Pester -Configuration $config;",
    "$out = @{ passed = $r.PassedCount; failed = $r.FailedCount; coveragePercent = $r.CodeCoverage.CoveragePercent; missed = @($r.CodeCoverage.CommandsMissed | ForEach-Object { \"$($_.File):$($_.Line)\" }) };",
    `$out | ConvertTo-Json | Out-File -Encoding utf8 '${tmp.replace(/\\/g, "/")}'`,
  ].join(" ");
  const result = spawnSync("pwsh", ["-NoProfile", "-Command", cmd], { encoding: "utf8" });
  console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  if (fs.existsSync(coverageOut)) fs.unlinkSync(coverageOut);
  if (!fs.existsSync(tmp)) return { ok: false, error: "Pester run produced no output" };
  const summary = JSON.parse(fs.readFileSync(tmp, "utf8"));
  fs.unlinkSync(tmp);
  return {
    ok: summary.failed === 0 && summary.coveragePercent >= COVERAGE_THRESHOLD,
    summary,
  };
}

function runPytest(skillDir, scripts) {
  const covArgs = scripts.map((s) => ["--cov", s]).flat();
  const result = spawnSync(
    "pytest",
    [path.join(skillDir, "tests"), ...covArgs, "--cov-report=json", "-q"],
    { encoding: "utf8", cwd: process.cwd() }
  );
  console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  let percent = 0;
  if (fs.existsSync("coverage.json")) {
    const cov = JSON.parse(fs.readFileSync("coverage.json", "utf8"));
    percent = cov.totals ? cov.totals.percent_covered : 0;
    fs.unlinkSync("coverage.json");
  }
  return { ok: result.status === 0 && percent >= COVERAGE_THRESHOLD, summary: { percent, exitCode: result.status } };
}

function runBats(skillDir) {
  const batsFiles = listFilesRecursive(path.join(skillDir, "tests")).filter((f) => f.endsWith(".bats"));
  if (!batsFiles.length) return { ok: true, summary: { note: "no .bats files" } };
  const result = spawnSync("bats", batsFiles, { encoding: "utf8" });
  console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  return { ok: result.status === 0, summary: { exitCode: result.status } };
}

// C.12 — every skill needs Set A (X1-X4) regardless of test-strategy; T2/T3
// also need Set B (X5-X7); T3 also needs Set C (X11-X12, the two of X11-X16
// that are properties of the skill itself rather than the agent runtime).
const REQUIRED_X_NUMBERS = {
  T1: ["X1", "X2", "X3", "X4"],
  T2: ["X1", "X2", "X3", "X4", "X5", "X6", "X7"],
  T3: ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "X11", "X12"],
};

function checkEvalsLog(dir, fm) {
  const errors = [];
  const evalsPath = path.join(dir, "tests", "evals.md");
  const tier = fm?.metadata?.["risk-tier"];
  const required = REQUIRED_X_NUMBERS[tier] || REQUIRED_X_NUMBERS.T1;

  if (!fs.existsSync(evalsPath) || fs.readFileSync(evalsPath, "utf8").trim().length === 0) {
    errors.push(fail(`Every skill requires a non-empty ${evalsPath} (C.12 Set A) — got none`));
    return errors;
  }

  const evalsContent = fs.readFileSync(evalsPath, "utf8");
  const missing = required.filter((x) => !new RegExp(`^##\\s+${x}\\b`, "im").test(evalsContent));
  if (missing.length) {
    errors.push(fail(`${evalsPath} is missing required eval section(s) for tier ${tier || "T1"}: ${missing.join(", ")}`));
  } else {
    console.log(`  ✓ Eval log present with required sections (${required.join(", ")}): ${evalsPath}`);
  }
  return errors;
}

const rawDirs = (process.env.CHANGED_DIRS || "").trim();
const dirs = rawDirs.split(/[\s\n]+/).filter(Boolean);

if (!dirs.length) {
  console.log("No skill directories changed.");
  process.exit(0);
}

let anyFailure = false;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  console.log(`\n── ${dir} (test matrix) ──`);

  const skillMd = path.join(dir, "skill.md");
  if (!fs.existsSync(skillMd)) continue; // validate-skill.js already reports this

  const content = fs.readFileSync(skillMd, "utf8");
  const { fm, malformed } = parseFrontmatter(content);
  if (malformed || fm?.deprecated === true) continue;

  const strategy = fm?.metadata?.["test-strategy"];
  const errors = [...checkEvalsLog(dir, fm)];

  if (strategy === "automated" || strategy === "hybrid") {
    const scripts = listFilesRecursive(dir).filter((f) => /\.(ps1|py|sh|js)$/.test(f) && !f.includes(`${path.sep}tests${path.sep}`));
    const byLang = { ps1: [], py: [], sh: [], js: [] };
    for (const s of scripts) {
      const ext = path.extname(s).slice(1);
      const testFile = testFileFor(s);
      if (!testFile || !fs.existsSync(testFile)) {
        errors.push(fail(`\`${s}\` has no matching test file (expected \`${testFile}\`)`));
        continue;
      }
      byLang[ext].push(s);
    }

    if (byLang.ps1.length) {
      const r = runPester(dir, byLang.ps1);
      if (!r.ok) errors.push(fail(`Pester: ${JSON.stringify(r.summary || r.error)}`));
      else console.log(`  ✓ Pester: ${r.summary.passed} passed, coverage ${r.summary.coveragePercent}%`);
    }
    if (byLang.py.length) {
      const r = runPytest(dir, byLang.py);
      if (!r.ok) errors.push(fail(`pytest: ${JSON.stringify(r.summary)}`));
      else console.log(`  ✓ pytest: coverage ${r.summary.percent}%`);
    }
    if (byLang.sh.length) {
      const r = runBats(dir);
      if (!r.ok) errors.push(fail(`bats: ${JSON.stringify(r.summary)}`));
      else console.log(`  ✓ bats: all scenarios passed (no numeric coverage — see CONTRIBUTING.md)`);
    }
  } else {
    // validate-skill.js's schema/enum check already reports an invalid or missing
    // test-strategy value; nothing further to do here.
  }

  if (errors.length) anyFailure = true;
}

console.log("");
if (anyFailure) {
  console.log("❌ Test matrix failed — see findings above.");
  process.exit(1);
}
console.log("✅ Test matrix passed.");
