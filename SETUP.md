# CrestronAISkills — Setup Guide

Follow these steps to get the marketplace live on GitHub Pages.

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

1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **"GitHub Actions"**
3. Click **Save**

> The next push to `main` will automatically build and deploy the web UI.

---

## Step 4 — Push to GitHub

From your local repo folder, run:

```bash
git push origin main
```

This triggers the GitHub Actions workflows which will:
- ✅ Rebuild `registry.json` from all skills
- ✅ Build the React web UI
- ✅ Deploy to GitHub Pages at **https://CrestronEng.github.io/CrestronAISkills**

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

## Summary

| Step | Action | Where |
|------|--------|-------|
| 1 | Create GitHub OAuth App | https://github.com/settings/developers |
| 2 | Add `VITE_GITHUB_CLIENT_ID` secret | GitHub repo → Settings → Secrets |
| 3 | Enable GitHub Pages (source: GitHub Actions) | GitHub repo → Settings → Pages |
| 4 | `git push origin main` | Your terminal |
| 5 | Install marketplace extension locally | Your terminal |

---

## Web UI URL

Once live: **https://CrestronEng.github.io/CrestronAISkills**
