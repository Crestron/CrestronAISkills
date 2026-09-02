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
