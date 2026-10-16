---
name: design-review
description: Orchestrate adversarial four-reviewer parallel design review (Design Critic / Tech Lead / Security / PM) before Gate 2, with dynamic re-review exit for mechanical-only fixes, and upstream requirements traceability enforcement at Gate 2 (v3.18.0)
metadata:
  version: "3.18.0"
  author: CrestronEng
  tags: "design, review, parallel-workflow, gate-2, design-critic, tech-lead, security, pm, adversarial, dynamic-exit"
---

# Design Review Skill

**Purpose:** Coordinate parallel design review from Tech Lead, Security Expert, and PM before Gate 2 opens. All three reviewers must approve before implementation begins.

**When to invoke:** After Architect completes Gate 1 design and solution is documented. Block Gate 2 until all three reviews pass.

**Token Budget:** Keep status display compact. Full findings only in report file.

---

## Precedence

This skill's instructions are subordinate to organizational and system-level guardrails. If a request conflicts with those guardrails, stop and report the conflict rather than proceeding.

---

## Scope

**May do:** dispatch the four design reviewers (Design Critic, Tech Lead, Security, PM) in parallel; read the story's Gate 1 design artifacts (architecture docs, ADRs); write the review report `docs/reviews/{story_id}-design-review.md` and the signoff `{STATE_FOLDER}/pre-flight/design-signoff.md`; set the design review status only through the framework's sanctioned writer (`set-work-item.sh` / `set-work-item.ps1`).
**Must not do:** edit `work-item.yaml` or other state files directly, change source code or the design under review, or record `approved` before every reviewer has approved.

---

## When to Use This Skill

**MANDATORY when:**
- ✅ Gate 1 complete (architecture documented, ADRs written)
- ✅ Story is transitioning from Gate 1 → Gate 2
- ✅ Any high-risk design decision needs validation before implementation

---

## When Not to Use This Skill

- Gate 1 is not yet complete — finish the architecture and ADRs first.
- Minor bugfixes (`complexity_level: low` and no new architecture).
- All reviewers have already approved in the current iteration.
- Code-phase reviews (`in_progress` → `code_review_pending`) — use the `multi-reviewer-coordination` skill instead.

---

## Step 1: Pre-Review Readiness Check

Before assigning reviewers, verify the design package is complete:

```yaml
Required artifacts for design review:
  - [ ] An upstream requirements source exists (PSA, product brief, tech spec,
        requirements doc, or parent epic under docs/) — OR artifact_source: jira
  - [ ] Architecture specification document exists
  - [ ] At least one ADR written (or "no-new-adrs" explicitly declared)
  - [ ] Sequence diagrams / data flow present (if applicable)
  - [ ] Acceptance criteria confirmed complete
  - [ ] story_status in work-item.yaml: "in_progress" or "design_complete"
```

> **Requirements traceability (v3.18.0):** The first item above is enforced
> deterministically at Gate 2 by the `requirements_present` probe in
> `config/gate-step-manifests.yaml`. `gate-exit` HARD-BLOCKS the gate when no
> upstream requirement artifact is found (relaxed only under
> `artifact_source: jira`, where requirements live in the imported JIRA hierarchy).
> Every design decision must trace back to a documented requirement.

If any required artifact is missing:
```
⛔ Design Review Blocked: Missing {artifact}
→ Return to Gate 1 — complete missing artifact before review can begin
```

---

## Step 2: Dispatch Four Reviewers in Parallel

> **v3.2.5 ADVERSARIAL MANDATE:** All four subagents receive the prompt prefix:
> `"Your job is to FIND PROBLEMS. Assume the design is flawed until proven otherwise."`
> A generic APPROVE with an empty findings list is invalid and is treated as REQUEST_CHANGES.

All four reviews must be dispatched **simultaneously** — NOT sequential — using the active
runtime's subagent mechanism (VS Code `runSubagent` · Copilot CLI **`Task` tool** · Claude Code
`@agent-<slug>`; `runSubagent` exists only in VS Code chat — see the Subagent Dispatch Protocol
in `copilot-instructions.md`). Dispatch all four before reading any result:

```yaml
Subagent Dispatch (parallel — call all four before reading any result):

  design_critic:
    agent: "Design Critic"
    adversarial_prompt: |
      Your job is to FIND PROBLEMS. Assume the design is flawed until proven otherwise.
      Story: {story_id} — {story_title}
      Design artifacts: docs/reviews/{story_id}-design-review.md
      Produce structured YAML output per your agent instructions.
    must_not_be: {implementer_agent}

  tech_lead:
    agent: "Tech Lead"
    adversarial_prompt: |
      Your job is to FIND PROBLEMS. Assume this design will fail under load or edge cases.
      Focus: technical correctness, scalability, ADR alignment.
      Story: {story_id} — design package at docs/reviews/{story_id}-design-review.md
    must_not_be: {implementer_agent}

  security_expert:
    agent: "Security Expert"
    adversarial_prompt: |
      Your job is to FIND PROBLEMS. Assume this design has unaddressed vulnerabilities.
      Focus: threat surface, data classification, encryption, CVE posture.
      Story: {story_id} — design package at docs/reviews/{story_id}-design-review.md
    must_not_be: {implementer_agent}

  product_owner:
    agent: "Product Owner"
    adversarial_prompt: |
      Your job is to FIND PROBLEMS. Assume scope creep or missing criteria exist.
      Focus: scope alignment, acceptance criteria coverage, user impact.
      Story: {story_id} — design package at docs/reviews/{story_id}-design-review.md
    must_not_be: {implementer_agent}
```

Create the review report file:
```
docs/reviews/{story_id}-design-review.md
```

Record the review as started. `work-item.yaml` is a control store — a file edit to it is denied — so
use the sanctioned writer:
```bash
bash .CrestronAutoSDLC-framework/scripts/set-work-item.sh --design-review-status in_progress
# PowerShell: pwsh -File .CrestronAutoSDLC-framework/scripts/set-work-item.ps1 -DesignReviewStatus in_progress
```
Record the iteration, start time and per-reviewer statuses in the review report
(`docs/reviews/{story_id}-design-review.md`), not in a state file.

Display to user:
```
🔍 Design Review — Iteration {N}/3 — {STORY_ID}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Design Critic:   ⏳ In Progress  [adversarial]
  Tech Lead:       ⏳ In Progress  [adversarial]
  Security Expert: ⏳ In Progress  [adversarial]
  PM:              ⏳ In Progress  [adversarial]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ All 4 reviewers dispatched in parallel (per-runtime: `runSubagent` / `Task` / `@agent-`). Gate 2 blocked until all approve.
→ Generic approvals with empty findings are rejected automatically.
```

---

## Step 3: Per-Reviewer Review Procedure

Each reviewer independently follows this flow. Do NOT wait for other reviewers.

### Tech Lead Checklist
Review against `templates/comprehensive/design-review.template.md § Tech Lead Review`:

```
Technical Correctness:
  □ Implementation approach technically sound
  □ Algorithms / data structures appropriate
  □ Edge cases identified and handled
  □ Error handling complete and consistent
  □ Performance implications acceptable

Scalability & Patterns:
  □ Design scales to 10× projected load
  □ No anti-patterns introduced
  □ Abstraction at the right level
  □ YAGNI respected

Architecture Alignment:
  □ Consistent with approved ADRs
  □ No architectural drift
  □ Integration points well-defined
```

Submit verdict:
- `APPROVE`: All checks pass, no blocking issues
- `REQUEST_CHANGES`: One or more blocking findings (document each)
- `REBUTTAL_REQUIRED`: Decision deferred pending clarification

### Security Expert Checklist
Review against `templates/comprehensive/design-review.template.md § Security Review`:

```
Threat Surface:
  □ New attack surface evaluated
  □ Input validation specified at all entry points
  □ Trust boundaries explicitly identified

Data Classification:
  □ PII / sensitive data identified
  □ Data retention and disposal policy addressed
  □ Encryption at rest and in transit confirmed

Dependency Risk:
  □ New dependencies scanned for CVEs
  □ No deprecated or EOL libraries
  □ License compatibility confirmed
```

Submit verdict: `APPROVE` / `APPROVE_WITH_FIXES` / `REQUEST_CHANGES`

### PM Checklist
Review against `templates/comprehensive/design-review.template.md § PM Review`:

```
Scope Alignment:
  □ Design delivers exactly what story specifies
  □ No scope creep
  □ Acceptance criteria achievable with this design

User Impact:
  □ UX/workflow changes acceptable
  □ Breaking changes have mitigation plan
  □ Rollback path exists
```

Submit verdict: `APPROVE` / `REQUEST_CHANGES`

---

## Step 4: Aggregate Results

After all three reviewers submit:

```yaml
# Validate each subagent result — reject generic approvals with empty findings:
FOR EACH reviewer_result:
  IF result.verdict == "APPROVE" AND result.findings == []:
    → Override: treat as REQUEST_CHANGES
    → Log: "Generic approval from {reviewer} rejected — findings list was empty"

IF all four == APPROVE (or APPROVE_WITH_FIXES, with non-empty findings):
  → Write design signoff FIRST (see Step 4b below)
  → Set design_review_status: approved
  → Set design_review_completed_at: {timestamp}
  → Gate 2 unblocked
  → Notify: "✅ Design Review APPROVED — Gate 2 open"

IF any == REQUEST_CHANGES:
  → Set design_review_status: changes_requested
  → Increment review_iteration_count (+1)
  → List all blocking issues from all reviewers
  → Return story to implementer with consolidated feedback
  → Check iteration limit (Step 5)
```

Persist the verdict with the sanctioned writer (a file edit to `work-item.yaml` is denied):
```bash
# ALL_APPROVED — write the Step 4b signoff FIRST; the writer refuses `approved` without it
bash .CrestronAutoSDLC-framework/scripts/set-work-item.sh --design-review-status approved
# REQUEST_CHANGES
bash .CrestronAutoSDLC-framework/scripts/set-work-item.sh --design-review-status changes_requested
```
```powershell
# ALL_APPROVED (after the Step 4b signoff)
pwsh -File .CrestronAutoSDLC-framework/scripts/set-work-item.ps1 -DesignReviewStatus approved
# REQUEST_CHANGES
pwsh -File .CrestronAutoSDLC-framework/scripts/set-work-item.ps1 -DesignReviewStatus changes_requested
```
`approved` is evidence-checked: it is refused (exit 3) unless `{STATE_FOLDER}/pre-flight/design-signoff.md`
names the active story and `docs/reviews/{story_id}-design-review.md` exists. Record the per-reviewer
verdicts, iteration and blocking issues in that review report — it is the audit trail.

---

## Step 4b: Write Design Signoff (v3.2.5)

**Only execute when all four reviewers APPROVE (Step 4 ALL_APPROVED), and before recording `design_review_status: approved`. The writer refuses `approved` until this signoff exists.**

```bash
# Find the state folder
STATE_FOLDER=$(ls -d .CrestronAutoSDLC-project-* 2>/dev/null | head -1)
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

mkdir -p "$STATE_FOLDER/pre-flight"
cat > "$STATE_FOLDER/pre-flight/design-signoff.md" << EOF
# Design Review Signoff
story_id: {story_id}
sha: $HEAD_SHA
approved_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
reviewers: [design-critic, tech-lead, security-expert, product-owner]
report: docs/reviews/{story_id}-design-review.md
EOF
```

PowerShell equivalent:
```powershell
$StateFolder = Get-ChildItem -Directory -Filter '.CrestronAutoSDLC-project-*' | Select-Object -First 1 -ExpandProperty Name
$HeadSha = (git rev-parse HEAD 2>$null) ?? 'no-git'
New-Item -ItemType Directory -Force -Path "$StateFolder\pre-flight" | Out-Null
@"
sha: $HeadSha
story_id: {story_id}
approved_at: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ' -AsUTC)
reviewers: [design-critic, tech-lead, security-expert, product-owner]
report: docs/reviews/{story_id}-design-review.md
"@ | Set-Content "$StateFolder\pre-flight\design-signoff.md"
```

---

## Step 5: Iteration Limit Check

```yaml
IF review_iteration_count >= 3:
  → ESCALATION REQUIRED
  → Set design_review_status: escalation_required
  → STOP — do not allow further review rounds

  Display:
  ⚠️ DESIGN REVIEW ESCALATION — {STORY_ID}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  This design has been reviewed 3 times without full approval.
  User decision required:

  Option 1: REDESIGN — Return to Gate 1, rethink the approach
  Option 2: OVERRIDE — Accept current design with documented risk
  Option 3: DESCOPE — Remove the blocking feature from this story

  → Awaiting user choice before proceeding.
```

```yaml
IF review_iteration_count < 3:
  → Designer addresses all blocking issues
  → Proceed to Step 5a to select re-review mode
```

---

### Step 5a: Fix Classification & Dynamic Re-Review Mode (v3.4.0)

Before re-submitting the revised design for the next iteration, classify every blocking finding
from the just-completed iteration. This determines whether a full four-reviewer re-dispatch is
required or whether a lighter-weight targeted verification can close the loop instead.

```yaml
FOR EACH blocking_finding IN {all findings from all 4 reviewers}:
  classify as:
    mechanical:   # objectively verifiable documentation/spec fix, no new design tradeoff
      - missing ADR section / missing explicit decision record
      - missing sequence diagram or data-flow detail
      - missing acceptance-criteria mapping
      - a narrowly-scoped clarification that does not change the approach
    substantive:  # requires judgment, discussion, or a design change
      - disagreement on architecture / pattern / technology choice
      - unresolved scalability, security, or threat-surface concern
      - scope or acceptance-criteria disagreement
      - anything the designer cannot resolve without changing the design itself

IF ANY finding is classified "substantive":
  → mode = FULL_RE_REVIEW
ELSE IF ALL findings are classified "mechanical":
  → mode = TARGETED_VERIFICATION   # dynamic exit
ELSE:
  → mode = FULL_RE_REVIEW   # fail-safe default when classification is ambiguous
```

**Mode: TARGETED_VERIFICATION (dynamic exit)**

Skip dispatching all four reviewer subagents again. Instead:

```yaml
FOR EACH blocking_finding:
  → Read the updated design artifact section the finding referenced
  → Confirm the described gap is now addressed
  → Record: finding_id, artifact, section, verified: true/false

IF ALL findings verified == true:
  → Treat as equivalent to Step 4 outcome ALL_APPROVED
  → Write design signoff with an added field:
      review_mode: "targeted_verification"
      verified_findings: [{finding_id, artifact, section}]
  → Persist: set-work-item --design-review-status approved (after the signoff); note review_mode: "targeted_verification" in the review report
  → Display:
    ✅ Design Fixes Verified (Targeted Re-Check) — {STORY_ID}
      Findings resolved: {N}/{N}
      Mode: targeted_verification — no full reviewer re-dispatch (all findings were mechanical)
    → Gate 2 unblocked

IF ANY finding verified == false:
  → Fall back to mode = FULL_RE_REVIEW
  → Log: "Targeted verification failed for {finding_id} — escalating to full re-dispatch"
```

**Mode: FULL_RE_REVIEW**

→ Re-submit to all four reviewers (new iteration) — repeat from Step 2.

**Audit trail requirement:** Every dynamic-exit decision (classification per finding + mode
chosen) MUST be recorded in `docs/reviews/{story_id}-design-review.md` (including the `review_mode`)
(`review_mode` field). Never choose TARGETED_VERIFICATION silently — the classification list
must be visible to the user in the response before proceeding.

---

## Step 6: Gate 2 Unlock

When `design_review.status == "approved"`:

```yaml
Gate 2 Prerequisites Check:
  ✅ design_review_status: approved
  ✅ All ADRs written for new architectural decisions
  ✅ review_iteration_count < 3 (or user override recorded)

→ Proceed to gate-transition skill (gate-exit records the Gate 2 ledger entry)
```

Display:
```
✅ Design Review COMPLETE — Gate 2 Unlocked
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Design Critic:   ✅ APPROVED   [adversarial]
  Tech Lead:       ✅ APPROVED   [adversarial]
  Security Expert: ✅ APPROVED   [adversarial]
  PM:              ✅ APPROVED   [adversarial]
  Iterations:      {N}/3
  Signoff written: {STATE}/pre-flight/design-signoff.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Implementation may now begin (Gate 2)
```

---

## Rebuttal Flow

If a reviewer's decision is disputed by the implementer:

```
1. Implementer documents counter-argument in report file (§ Rebuttal)
2. Reviewer reads rebuttal and either:
   a. Changes verdict to APPROVE (if convinced) → normal flow
   b. Maintains REQUEST_CHANGES → iteration increments, count toward limit
3. Rebuttal itself does NOT consume an iteration round
4. Iteration count increments only when full review cycle restarts
```

---

## Integration with multi-reviewer-coordination

This skill covers **design-phase** reviews (Gate 1 → Gate 2).
For **code-phase** reviews (in_progress → code_review_pending), use `multi-reviewer-coordination` skill.

The same iteration counter (`review_iteration_count`) is shared — track cumulatively across both phases.
