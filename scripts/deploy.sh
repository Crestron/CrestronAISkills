#!/usr/bin/env bash
# Run this after merging a skill PR to rebuild the registry and redeploy the site.
# Requirements: Node.js 18+, git

set -e

REPO_URL="https://github.com/CrestronEng/CrestronAISkills"
REGISTRY_URL="https://raw.githubusercontent.com/CrestronEng/CrestronAISkills/main/registry.json"

echo "=== Step 1: Pull latest changes from main ==="
git pull origin main

echo ""
echo "=== Step 2: Rebuild registry.json ==="
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
echo "=== Step 3: Commit registry.json back to main ==="
git add registry.json
if ! git diff --cached --quiet; then
  git commit -m "chore: update registry.json [skip ci]"
  git push origin main
  echo "  registry.json committed and pushed to main"
else
  echo "  No registry changes to commit."
fi

echo ""
echo "=== Step 4: Build web app ==="
cd web
VITE_REGISTRY_URL="$REGISTRY_URL" \
VITE_REPO_URL="$REPO_URL" \
VITE_BASE_PATH="/" \
npm run build
cp ../registry.json dist/registry.json
cd ..

echo ""
echo "=== Step 5: Deploy to gh-pages branch ==="
DIST="web/dist"
BRANCH="gh-pages"

git fetch origin
if git show-ref --quiet refs/remotes/origin/$BRANCH; then
  git worktree add /tmp/gh-pages-deploy -B $BRANCH origin/$BRANCH
else
  git worktree add --orphan -b $BRANCH /tmp/gh-pages-deploy
fi

cp -r $DIST/. /tmp/gh-pages-deploy/
touch /tmp/gh-pages-deploy/.nojekyll
cd /tmp/gh-pages-deploy
git add -A
if ! git diff --cached --quiet; then
  git commit -m "deploy: update GitHub Pages [$(date -u +%Y-%m-%dT%H:%M:%SZ)]"
  git push origin $BRANCH
  echo ""
  echo "✅ Deployed! Site: https://CrestronEng.github.io/CrestronAISkills"
else
  echo "No changes to deploy."
fi
cd -
git worktree remove /tmp/gh-pages-deploy --force

