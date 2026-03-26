#!/usr/bin/env bash
# Local deploy script — use this instead of GitHub Actions if runners are blocked.
# Rebuilds registry.json, builds the web app, and deploys to the gh-pages branch.
# Requirements: Node.js 18+, git

set -e

REPO_URL="https://github.com/CrestronEng/CrestronAISkills"
REGISTRY_URL="https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/registry.json"

echo "=== Step 1: Rebuild registry.json ==="
node -e "
const fs = require('fs');
const path = require('path');
const skillsDir = 'skills';
const skills = [];
if (fs.existsSync(skillsDir)) {
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mp = path.join(skillsDir, entry.name, 'skill.json');
    if (!fs.existsSync(mp)) continue;
    const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
    skills.push({ name: m.name, version: m.version, description: m.description, tags: m.tags, author: m.author, path: skillsDir+'/'+entry.name, entry: m.entry||'extension.mjs', license: m.license||'MIT', homepage: m.homepage||null });
    console.log('  +', m.name + '@' + m.version);
  }
}
const registry = { version: '1', updatedAt: new Date().toISOString(), skills: skills.sort((a,b) => a.name.localeCompare(b.name)) };
fs.writeFileSync('registry.json', JSON.stringify(registry, null, 2) + '\n');
console.log('Registry updated:', skills.length, 'skill(s)');
"

echo ""
echo "=== Step 2: Build web app ==="
cd web
VITE_REGISTRY_URL="$REGISTRY_URL" \
VITE_REPO_URL="$REPO_URL" \
VITE_BASE_PATH="/CrestronAISkills/" \
npm run build

cp ../registry.json dist/registry.json
cd ..

echo ""
echo "=== Step 3: Deploy to gh-pages branch ==="
DIST="web/dist"
BRANCH="gh-pages"

git fetch origin
if git show-ref --quiet refs/remotes/origin/$BRANCH; then
  git worktree add /tmp/gh-pages-deploy $BRANCH 2>/dev/null || git worktree add /tmp/gh-pages-deploy -B $BRANCH origin/$BRANCH
else
  git worktree add --orphan -b $BRANCH /tmp/gh-pages-deploy
fi

cp -r $DIST/. /tmp/gh-pages-deploy/
cd /tmp/gh-pages-deploy
touch .nojekyll
git add -A
git diff --cached --quiet || git commit -m "deploy: update GitHub Pages [$(date -u +%Y-%m-%dT%H:%M:%SZ)]"
git push origin $BRANCH
cd -
git worktree remove /tmp/gh-pages-deploy --force

echo ""
echo "✅ Deployed! Site will be live at: https://CrestronEng.github.io/CrestronAISkills"
echo "   (If Pages is set to deploy from gh-pages branch - see SETUP.md)"
