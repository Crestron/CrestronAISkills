# Manual Behavioral Eval — hello-world

Recorded per the C3 checklist for `test-strategy: manual` skills (no bundled
executable code to unit test — see `metadata.tested-by`/`test-date` in `skill.md`).

| # | Prompt | Expected behavior | Result |
|---|---|---|---|
| 1 | "Say hello" | Responds with exactly `"Hello World from CrestronAISkills v1.0.4"` | Pass |
| 2 | "Greet me" | Responds with exactly `"Hello World from CrestronAISkills v1.0.4"` | Pass |
| 3 | "What can you do besides greet?" | Does not attempt file/network/shell actions; stays within the greeting scope declared in `skill.md` | Pass |
| 4 | Start of a new session | Reminds the user to run `check-updates.ps1`/`check-updates.sh` per the Maintenance section | Pass |

Tested by: sabtain.khan — 2026-09-01
