# One-Time Setup: GitHub App for Cross-Org Skill Sync

`sync-skill.yml` needs to read repos in orgs other than Crestron. A single
fine-grained PAT can only be scoped to one org/account, so we use a GitHub
App instead — registered once, then installed independently by each org
that wants to contribute skills, with zero further changes on our side per
new org.

This doc is written for whoever has **organization owner** permissions on
the Crestron GitHub org — registering an org-owned app requires that,
not just repo-admin rights.

## Part A — Register the app (do this once)

1. Open: **https://github.com/organizations/Crestron/settings/apps/new**
   (Registering it here, under the org, means it isn't tied to any one
   person's personal GitHub account.)

2. Fill in exactly:
   - **GitHub App name**: `crestron-skill-sync`
     (If GitHub says that name is taken, try `crestron-ai-skill-sync` instead
     — the name just has to be globally unique across all of GitHub.)
   - **Homepage URL**: `https://github.com/Crestron/CrestronAISkills`
   - **Webhook**: scroll to the Webhook section and **uncheck "Active"**.
     Leave the Webhook URL field blank. We don't use webhooks for this.

3. Scroll to **Permissions** → **Repository permissions** → find the row
   labeled **Contents** → set its dropdown to **Read-only**.
   Leave every other permission on this page as "No access" (the default —
   don't touch anything else).

4. Scroll to **Where can this GitHub App be installed?** → select
   **"Any account"**.
   (This is the setting that lets other orgs install it later — if this is
   left on "Only on this account," it will only ever work for Crestron's own
   repos.)

5. Click **Create GitHub App**.

6. You're now on the app's settings page. Two things to collect here:
   - **App ID** — a number near the top of the page. Write it down.
   - Scroll to **Private keys** → click **Generate a private key**. This
     downloads a `.pem` file to your computer. This is the only time you can
     get this exact file — save it somewhere safe. (If it's ever lost, a new
     one can be generated later, but the old one stops working the moment
     you do.)

7. Still on the same page, click **Install App** in the left sidebar →
   click **Install** next to "Crestron" → choose **"Only select
   repositories"** → select `CrestronAISkills` and `skill-sync-fixture` →
   click **Install**.

## Part B — Hand off the two secrets

Do **not** paste the App ID or the private key into a chat message or
commit them anywhere. Run these two commands instead (they prompt for the
value on stdin, so it never appears in scrollback/history):

```bash
gh secret set SKILL_SYNC_APP_ID --repo Crestron/CrestronAISkills
# paste the App ID number, press Enter, then Ctrl+D (or Ctrl+Z on Windows)

gh secret set SKILL_SYNC_APP_PRIVATE_KEY --repo Crestron/CrestronAISkills < path/to/the-downloaded-key.pem
```

## Part C — Onboarding each additional org (repeat per org, no work on our side)

Once the app exists, give whoever administers a *new* source org this one
step — nothing else is needed from us:

1. Open: `https://github.com/apps/crestron-skill-sync/installations/new`
   (swap in `crestron-ai-skill-sync` if that was the name actually used in
   step A2)
2. If prompted, pick their organization.
3. Choose **"Only select repositories"** and pick the specific repo(s) they
   want available for skill syncing.
4. Click **Install**.

No secret exchange, no coordination with us beyond that click. If a repo
hasn't had the app installed on it yet, a sync attempt against it fails with
a clear "app not installed on this repository" error rather than a confusing
auth failure.

## Part D — Register the writer app (do this once)

`crestron-skill-sync` (Parts A–C) only **reads** team repos. A second app,
`crestron-skill-sync-writer`, is the only thing that **writes**: it pushes the
`sync/<skill>` branch and opens the PR in `Crestron/CrestronAISkills`.

Why a separate app: a PR opened with the workflow's built-in `GITHUB_TOKEN`
doesn't start other workflows, so validation, security scanning, tests, and
plugin generation would never run on sync PRs. An app token does trigger them.
Keeping write access in its own app means the reader app installed across team
orgs stays read-only, and the write key only works on this one repo.

Like Part A, this needs a Crestron **organization owner**.

1. Open: **https://github.com/organizations/Crestron/settings/apps/new**

2. Fill in:
   - **GitHub App name**: `crestron-skill-sync-writer`
     (if taken, use `crestron-ai-skill-sync-writer`)
   - **Homepage URL**: `https://github.com/Crestron/CrestronAISkills`
   - **Webhook**: uncheck **"Active"** and leave the URL blank.

3. **Permissions** → **Repository permissions** — set only these two:
   - **Contents**: **Read and write**
   - **Pull requests**: **Read and write**

   Leave everything else at "No access" (*Metadata: Read-only* is added
   automatically).

4. **Where can this GitHub App be installed?** → **"Only on this account"**, so
   it can never be installed in another org.

5. Click **Create GitHub App**, note the **App ID**, then under
   **Private keys** click **Generate a private key** (save the downloaded
   `.pem` until step 7).

6. In the left sidebar, **Install App** → **Install** next to "Crestron" →
   **"Only select repositories"** → select **`CrestronAISkills`** only →
   **Install**.

7. Add the secrets without pasting them anywhere visible:

   ```bash
   gh secret set SKILL_SYNC_WRITER_APP_ID --repo Crestron/CrestronAISkills
   # paste the App ID, press Enter, then Ctrl+D (Ctrl+Z then Enter on Windows)

   gh secret set SKILL_SYNC_WRITER_APP_PRIVATE_KEY --repo Crestron/CrestronAISkills < path/to/the-writer-key.pem
   ```

   Then delete the downloaded `.pem` file.

8. Confirm `gh secret list --repo Crestron/CrestronAISkills` shows all four:
   `SKILL_SYNC_APP_ID`, `SKILL_SYNC_APP_PRIVATE_KEY`,
   `SKILL_SYNC_WRITER_APP_ID`, `SKILL_SYNC_WRITER_APP_PRIVATE_KEY`.

Team orgs are unaffected: they keep installing only the read-only app (Part C)
and never see the writer app. Until the writer secrets exist, `sync-skill.yml`
fails at its first step ("Get writer token for this repository").
