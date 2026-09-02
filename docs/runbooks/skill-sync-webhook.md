# Runbook: Promoting Skill Sync from Manual to Webhook-Triggered

**Status: not implemented.** `sync-skill.yml` is currently `workflow_dispatch`
only — someone runs it by hand when a team is ready to publish or re-publish a
skill. This runbook exists so that decision can be revisited later without
re-deriving the design from scratch.

## When to promote

Manual was the deliberate starting choice (see PR discussion): it needs zero
new cross-repo credentials and matches "teams transfer a skill occasionally,"
not "teams publish continuously." Promote to a webhook when **either**:

- More than a handful of teams are running manual re-syncs on a recurring
  (e.g. monthly) basis, and it's become toil someone has to remember to do, or
- Staleness between a team's source repo and its mirror here has caused a
  real incident or complaint (an out-of-date skill in the registry that
  should have been updated already).

Don't promote speculatively — the manual trigger's small cross-repo attack
surface is a real property worth keeping until there's a measured reason not
to.

## What changes

### 1. `sync-skill.yml`'s trigger

Add a `repository_dispatch` trigger alongside the existing `workflow_dispatch`:

```yaml
on:
  workflow_dispatch:
    inputs: { ... unchanged ... }
  repository_dispatch:
    types: [skill-release]
```

The dispatch payload (`client_payload`) needs to carry the same four inputs
`workflow_dispatch` collects today:

```json
{
  "event_type": "skill-release",
  "client_payload": {
    "source_repo": "Crestron/team-widgets",
    "source_ref": "v1.4.0",
    "source_path": "ai-skills/widget-helper",
    "target_name": "widget-helper"
  }
}
```

Every step in the job that currently reads `inputs.*` needs a parallel
`github.event.client_payload.*` fallback (or normalize both into one set of
job-level `env:` vars at the top of the job).

### 2. The source repo's release workflow

Each participating team's repo needs a small workflow added on their end —
this is the real cost of going to a webhook, since it's boilerplate every
team must adopt, not just us:

```yaml
name: Notify CrestronAISkills of a new skill release
on:
  release:
    types: [published]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.CRESTRON_AI_SKILLS_DISPATCH_TOKEN }}
          repository: Crestron/CrestronAISkills
          event-type: skill-release
          client-payload: |
            {
              "source_repo": "${{ github.repository }}",
              "source_ref": "${{ github.event.release.tag_name }}",
              "source_path": "ai-skills/widget-helper",
              "target_name": "widget-helper"
            }
```

### 3. New credential: a token *they* hold that can dispatch to *us*

This is the part that increases the security surface and needs a real
decision, restated from the original design discussion:

| | Fine-grained PAT | GitHub App |
|---|---|---|
| Setup cost | Low — mint one token, hand it to each team to store as their own repo secret | Higher — register an app, install it per source repo |
| Expiry / rotation | Tied to a person's account; needs manual renewal | No person-tied expiry |
| Blast radius if leaked | Whatever repos/scopes it was minted with — should be scoped to *just* `repository_dispatch` on CrestronAISkills, nothing else | Scoped per-installation already |
| Who holds it | Every team's repo gets a copy of the same (or per-team) token | One app installation per source repo, centrally revocable |

Recommendation when this gets built: a GitHub App, even though it's more
upfront work — a shared PAT copied into N team repos is N places it can leak,
and revoking/rotating a leaked PAT means touching every team's repo secrets
instead of one app installation.

### 4. Monitoring

A webhook that silently fails (misconfigured secret, source repo's workflow
broken) is invisible to us unless something watches for it. At minimum, add a
scheduled job (same pattern as `validate-skill-full.yml`) that checks whether
any `source-repo`-tagged skill's `synced-at` is older than some threshold
(e.g. 90 days) relative to a `HEAD` check against the source repo's latest
release, and files an issue if so.

## What does *not* need to change

Everything downstream of the sync script — `sync-skill.js`, the frontmatter
merge rules, the `sync/<name>` branch convention, the PR pipeline, the
per-skill lock-policy warning in `validate-skill.js` — is trigger-agnostic
and needs no changes. Only how the workflow starts changes.
