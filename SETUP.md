# CrestronAISkills — Setup Guide

Follow these steps to get the marketplace live on GitHub Pages.

> ⚠️ **Organisation IP Allow List:** If your GitHub org has an IP allow list enabled, GitHub-hosted Actions runners will be blocked. See [Deployment Options](#deployment-options) below for how to handle this.

---

## Step 1 — Create a GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in the following:
   - **Application name:** `CrestronAISkills`
   - **Homepage URL:** `https://CrestronEng.github.io/CrestronAISkills`
   - **Authorization callback URL:** `https://github.com/login/device/code`
4. Click **Register application**
5. On the next page, copy the **Client ID** (looks like `Ov23liXXXXXXXXXXX`)

---

## Step 2 — Add the Client ID as a Repository Secret

1. Go to your repo on GitHub: **https://github.com/CrestronEng/CrestronAISkills**
2. Click **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Set:
   - **Name:** `VITE_GITHUB_CLIENT_ID`
   - **Value:** *(paste your Client ID from Step 1)*
5. Click **Add secret**

---

## Step 3 — Enable GitHub Pages

> ℹ️ **You don't need a separate GitHub Pages site.** GitHub automatically provides a Pages URL for any repository — yours will be `https://CrestronEng.github.io/CrestronAISkills` once enabled.

1. Go to **https://github.com/CrestronEng/CrestronAISkills/settings/pages**
2. Under **Source**, select **"GitHub Actions"** *(if using self-hosted runner or GitHub Actions)*
   — OR — select **"Deploy from a branch"** → branch: `gh-pages` *(if deploying locally with the deploy script)*
3. Click **Save**

---

## Step 4 — Deploy

Choose the option that works for your environment:

---

### Option A — Self-Hosted Runner (Recommended for orgs with IP allow lists)

Set up your own machine as a GitHub Actions runner so workflows run on your IP (which is already allowed).

1. Go to **https://github.com/CrestronEng/CrestronAISkills/settings/actions/runners**
2. Click **"New self-hosted runner"**
3. Select your OS and follow the installation instructions shown on screen
4. Once the runner is online, push any change to `main` to trigger the workflows:
   ```bash
   git commit --allow-empty -m "trigger: run workflows" && git push origin main
   ```

---

### Option B — Local Deploy Script (No runner needed)

Run everything on your machine. No GitHub Actions required.

**On Windows (PowerShell):**
```powershell
# From the repo root
.\scripts\deploy.ps1
```

**On macOS/Linux:**
```bash
# From the repo root
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This will:
- ✅ Rebuild `registry.json` from all skills
- ✅ Build the React web UI
- ✅ Push the built site to the `gh-pages` branch

> Make sure GitHub Pages is set to **"Deploy from a branch" → `gh-pages`** (not "GitHub Actions") when using this option.

---

## Step 5 — Install the Marketplace Extension (Optional)

To use the marketplace directly inside Copilot CLI:

**On Windows (PowerShell):**
```powershell
$dest = "$HOME\.copilot\extensions\marketplace"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item ".github\extensions\marketplace\extension.mjs" "$dest\extension.mjs"
```

**On macOS/Linux:**
```bash
mkdir -p ~/.copilot/extensions/marketplace
cp .github/extensions/marketplace/extension.mjs ~/.copilot/extensions/marketplace/
```

Then restart Copilot CLI. You can now say things like:
- *"search for skills about automation in the marketplace"*
- *"install the example-skill from the marketplace"*
- *"list my installed marketplace skills"*

---

## Deployment Options

| Option | How | GitHub Pages Source setting |
|--------|-----|-----------------------------|
| **Self-hosted runner** | Install runner on your machine, push to `main` | "GitHub Actions" |
| **Local deploy script** | Run `scripts/deploy.ps1` or `scripts/deploy.sh` | "Deploy from a branch" → `gh-pages` |

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create GitHub OAuth App at https://github.com/settings/developers |
| 2 | Add `VITE_GITHUB_CLIENT_ID` secret in repo Settings → Secrets |
| 3 | Enable GitHub Pages in repo Settings → Pages |
| 4 | Deploy via self-hosted runner OR local deploy script |
| 5 | Install marketplace extension locally (optional) |

---

## Web UI URL

Once live: **https://CrestronEng.github.io/CrestronAISkills**
