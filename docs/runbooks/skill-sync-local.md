# Runbook: Sync a Skill From Your Own Machine

Use this when `sync-skill.yml` can't read the source repo — most commonly the
**CrestronEng** org's IP allow list, which blocks GitHub-hosted runners. The run
fails at **"Get installation token for the source org"** with
`organization has an IP allow list enabled`.

The scripts below do exactly what the workflow does — same
`.github/scripts/sync-skill.js`, same branch (`sync/<name>`), same PR title — but
from your machine, which can reach the source repo over VPN.

## Before you start

- On an **allow-listed network** (Crestron office or VPN)
- **git**, **Node.js 22**, and the **GitHub CLI** installed
- `gh auth status` shows you're signed in, with read access to the source repo
  and write access to `Crestron/CrestronAISkills`

## Run it

**Windows (PowerShell):**

```powershell
./scripts/sync-skill-local.ps1 -SourceRepo CrestronEng/CrestronAutoSDLC -SourcePath dotgithub-contents/skills/design-review
```

**Mac / Linux:**

```bash
./scripts/sync-skill-local.sh --source-repo CrestronEng/CrestronAutoSDLC --source-path dotgithub-contents/skills/design-review
```

Options:

| PowerShell | Bash | Meaning |
| --- | --- | --- |
| `-SourceRef <sha>` | `--source-ref <sha>` | Full 40-character commit to sync. Default: latest commit on the repo's default branch |
| `-Name <skill>` | `--name <skill>` | Skill name here. Default: last folder of the source path |
| `-DryRun` | `--dry-run` | Do everything except push/open the PR; keeps the work folder so you can inspect it |

## What it does

1. Checks prerequisites and validates the inputs (owner/repo, 40-char SHA, skill name).
2. Clones `CrestronAISkills` (`main`) and the source repo at the exact commit into a temporary folder.
3. Runs the sync script and commits `skills/<name>/` and `copilot-skills/<name>/`.
4. Pushes `sync/<name>` and **opens a PR** — or **updates the existing PR** if one is already open for that branch.
5. Prints the PR link and deletes the temporary folder.

Because a person pushes the branch, the full CI runs on the PR: **Validate Skill**,
**Test Skill**, and **Test Tooling**.

## Notes

- **Re-syncs reset the branch.** Like the workflow, the script rebuilds
  `sync/<name>` from `main` and force-pushes. For a new skill, finish source-side
  changes first, sync once, then fill in the compliance fields on the PR and merge
  without re-syncing — otherwise PR edits are lost.
- **Long-term fix:** ask Crestron IT / CrestronEng admins for a self-hosted runner
  on an allow-listed network or GitHub larger runners with static IPs, so
  `sync-skill.yml` can run unattended.
