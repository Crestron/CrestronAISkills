## What changed
<!-- Describe the skill being added or updated, and why. -->

## Pre-submission checklist
<!-- Complete before opening the PR. CI will verify the schema automatically. -->
- [ ] Directory name exactly matches the `name` field in frontmatter
- [ ] All required frontmatter fields set: `name`, `version`, `description`, `tags`, `author`
- [ ] `metadata.team`, `metadata.maintainer`, and `metadata.dependencies` are set
- [ ] Version follows semver (`major.minor.patch`) and was bumped from the previous release
- [ ] Tested locally with GitHub Copilot or Claude Code

---

## C1 — Registry Entry

### Auto-verified by CI
> These are checked automatically — no action needed. The validator will block the PR if any fail.

- [x] Skill name matches directory name and follows naming rules
- [x] Semantic version present and valid (`major.minor.patch`)
- [x] Description within required length (10–1024 chars)
- [x] At least one tag, all lowercase
- [x] Author set
- [x] `metadata.team` set
- [x] `metadata.maintainer` set
- [x] `metadata.dependencies` set (or `None`)

### Reviewer: human review required
<!-- Complete during code review before approving. -->
- [ ] Input schema documented — all parameter types and validation rules described in skill body
- [ ] Output schema documented — maximum output size declared
- [ ] Scope constraints declared — what the skill can and cannot do is explicit
- [ ] Test coverage documented and meets minimum thresholds (see C3 in CONTRIBUTING.md)
- [ ] Approving AI Workgroup member identified and recorded

---

## C2 / C3 / C4 — Design, Test Coverage, Versioning & Runtime

> Complete for **MAJOR** and **MINOR** version changes. See the full
> [Skill Approval Checklist](../blob/main/CONTRIBUTING.md#skill-approval-checklist) in CONTRIBUTING.md.

- [ ] C2 design requirements reviewed
- [ ] C3 test coverage requirements reviewed
- [ ] C4 versioning and runtime controls reviewed

---

<!-- Non-skill PR (workflow fix, docs, etc.)? Delete everything above and describe your change. -->
