# CrestronAISkills — Setup Guide

Follow these steps to get the marketplace live on GitHub Pages.

> ⚠️ **Organisation IP Allow List:** If your GitHub org has an IP allow list enabled, GitHub-hosted Actions runners will be blocked. See [Deployment Options](#step-4--deploy) below.

---

## Step 1 — Create a GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in the following:
   - **Application name:** `CrestronAISkills`
   - **Homepage URL:** `https://CrestronEng.github.io/CrestronAISkills`
   - **Authorization callback URL:** `https://github.com/login/device/code`
4. Click **Register application**
5. Copy the **Client ID** (looks like `Ov23liXXXXXXXXXXX`)

---

## Step 2 — Add the Client ID as a Repository Secret

1. Go to **https://github.com/CrestronEng/CrestronAISkills/settings/secrets/actions**
2. Click **"New repository secret"**
3. Set:
   - **Name:** `VITE_GITHUB_CLIENT_ID`
   - **Value:** *(paste your Client ID)*
4. Click **Add secret**

---

## Step 3 — Enable GitHub Pages

> ℹ️ You don't need a separate GitHub Pages site — GitHub provides it free for any repo.

1. Go to **https://github.com/CrestronEng/CrestronAISkills/settings/pages**
2. Set **Source** based on your deploy method:
   - Using **GitHub Actions runner** → select `"GitHub Actions"`
   - Using **local deploy script** → select `"Deploy from a branch"` → branch: `gh-pages`
3. Click **Save**

---

## Step 4 — Deploy

### Option A — Local Deploy Script *(use this if GitHub Actions runners are blocked)*

After merging any PR that adds or updates a skill, run this from the repo root on your machine:

**Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1
```

**macOS/Linux:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script does everything automatically:
1. Pulls latest `main`
2. Rebuilds `registry.json` from all skills in `skills/`
3. Commits & pushes updated `registry.json` back to `main`
4. Builds the React web app
5. Deploys built files to the `gh-pages` branch

> **This keeps both the website AND the Copilot CLI extension in sync** — the CLI reads `registry.json` from `main`, the website is served from `gh-pages`.

---

### Option B — Self-Hosted Runner *(automated, runs on your machine)*

Set up your machine as a GitHub Actions runner so workflows trigger automatically on every merge.

1. Go to **https://github.com/CrestronEng/CrestronAISkills/settings/actions/runners**
2. Click **"New self-hosted runner"** and follow the setup instructions
3. Once online, workflows run automatically — no manual steps needed

---

### Option C — Allow GitHub Actions IPs *(fully automated, best long term)*

Ask your org admin to go to:
**https://github.com/organizations/CrestronEng/settings/security**
→ IP allow list → enable **"Allow GitHub Actions"**

Once done, change Pages source back to **"GitHub Actions"** and workflows run fully automatically on every push to `main`.

---

## Step 5 — Install the Marketplace Extension (Optional)

Use the marketplace directly inside Copilot CLI:

**Windows (PowerShell):**
```powershell
$dest = "$HOME\.copilot\extensions\marketplace"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item ".github\extensions\marketplace\extension.mjs" "$dest\extension.mjs"
```

**macOS/Linux:**
```bash
mkdir -p ~/.copilot/extensions/marketplace
cp .github/extensions/marketplace/extension.mjs ~/.copilot/extensions/marketplace/
```

Restart Copilot CLI, then try:
- *"search for skills about automation in the marketplace"*
- *"install the example-skill from the marketplace"*
- *"list my installed marketplace skills"*

---

## Maintainer Workflow (after merging a contributor PR)

```
1. Contributor opens PR → you review → merge to main
2. Run: .\scripts\deploy.ps1   (Windows)
        ./scripts/deploy.sh    (macOS/Linux)
3. Site and registry update automatically ✅
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create GitHub OAuth App |
| 2 | Add `VITE_GITHUB_CLIENT_ID` repo secret |
| 3 | Enable GitHub Pages |
| 4 | Deploy (local script, self-hosted runner, or allow GitHub Actions) |
| 5 | Install marketplace extension locally (optional) |

**Web UI:** https://CrestronEng.github.io/CrestronAISkills
