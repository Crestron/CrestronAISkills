#!/usr/bin/env bash
# CrestronAISkills - Skill Installer (Mac/Linux)
# Requires: bash (built-in), curl (built-in on Mac, common on Linux)
# Placeholders replaced at download time: __SKILL_NAME__, __SKILL_VERSION__, __REGISTRY_URL__, __PAGES_URL__

SKILL_NAME="__SKILL_NAME__"
SKILL_VERSION="__SKILL_VERSION__"
REGISTRY_URL="__REGISTRY_URL__"
PAGES_URL="__PAGES_URL__"

echo ""
echo "CrestronAISkills — Installing: $SKILL_NAME v$SKILL_VERSION"
echo "──────────────────────────────────────────────────"

CONFIG_DIR="$HOME/.copilot/skills"
mkdir -p "$CONFIG_DIR"

# 1. Get or reuse stored GitHub PAT
TOKEN_FILE="$CONFIG_DIR/github-token"
if [ -f "$TOKEN_FILE" ]; then
    GH_TOKEN=$(cat "$TOKEN_FILE")
    echo "  Using stored GitHub token."
else
    echo ""
    echo "  A GitHub Personal Access Token (PAT) with 'read:org' scope is required"
    echo "  for auto-updates (private Pages site). You only need to enter this once."
    echo ""
    read -rsp "  Enter your GitHub PAT: " GH_TOKEN
    echo ""
    if [ -z "$GH_TOKEN" ]; then echo "ERROR: PAT required."; exit 1; fi
    echo "$GH_TOKEN" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    echo "  Token saved to $TOKEN_FILE"
fi

# 2. Ask for project path
DEFAULT_PATH=$(pwd)
echo ""
read -rp "Enter your project root path (press Enter for: $DEFAULT_PATH): " PROJECT_PATH
if [ -z "$PROJECT_PATH" ]; then PROJECT_PATH="$DEFAULT_PATH"; fi
if [ ! -d "$PROJECT_PATH" ]; then echo "ERROR: Path not found: $PROJECT_PATH"; exit 1; fi
PROJECT_PATH=$(cd "$PROJECT_PATH" && pwd)
echo "  Project path: $PROJECT_PATH"

# 3. Install skill.md to .github/skills/<name>/
SKILLS_FOLDER="$PROJECT_PATH/.github/skills/$SKILL_NAME"
mkdir -p "$SKILLS_FOLDER"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_MD="$SKILLS_FOLDER/skill.md"
cp "$SCRIPT_DIR/skill.md" "$DEST_MD"
echo "  Installed to $DEST_MD"

# 4. Save config
CONFIG_PATH="$CONFIG_DIR/$SKILL_NAME-config.json"
cat > "$CONFIG_PATH" <<EOF
{
  "name": "$SKILL_NAME",
  "version": "$SKILL_VERSION",
  "projectPath": "$PROJECT_PATH",
  "registryUrl": "$REGISTRY_URL",
  "pagesUrl": "$PAGES_URL",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "  Config saved to $CONFIG_PATH"

# 4b. Download check-updates.ps1 / check-updates.sh to config dir
curl -sf -H "Authorization: token $GH_TOKEN" "$PAGES_URL/scripts/check-updates.ps1" -o "$CONFIG_DIR/check-updates.ps1" && echo "  check-updates.ps1 saved to $CONFIG_DIR/check-updates.ps1" || echo "  Warning: could not download check-updates.ps1"
curl -sf -H "Authorization: token $GH_TOKEN" "$PAGES_URL/scripts/check-updates.sh" -o "$CONFIG_DIR/check-updates.sh" && chmod +x "$CONFIG_DIR/check-updates.sh" && echo "  check-updates.sh saved to $CONFIG_DIR/check-updates.sh" || echo "  Warning: could not download check-updates.sh"

# 5. Write update script
UPDATE_SCRIPT="$CONFIG_DIR/update-$SKILL_NAME.sh"
cat > "$UPDATE_SCRIPT" <<'UPDATESCRIPT'
#!/usr/bin/env bash
CONFIG_DIR="$HOME/.copilot/skills"
CONFIG_FILE="$CONFIG_DIR/__SKILL_NAME__-config.json"
TOKEN_FILE="$CONFIG_DIR/github-token"
GH_TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null)
SKILL_NAME=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['name'])" 2>/dev/null || grep '"name"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
INSTALLED_VER=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['version'])" 2>/dev/null || grep '"version"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
REGISTRY_URL=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['registryUrl'])" 2>/dev/null || grep '"registryUrl"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PAGES_URL=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['pagesUrl'])" 2>/dev/null || grep '"pagesUrl"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PROJECT_PATH=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['projectPath'])" 2>/dev/null || grep '"projectPath"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
REGISTRY=$(curl -sf -H "Authorization: token $GH_TOKEN" "$REGISTRY_URL")
if [ -z "$REGISTRY" ]; then exit 1; fi
LATEST_VER=$(echo "$REGISTRY" | python3 -c "import json,sys; r=json.load(sys.stdin); s=[x for x in r['skills'] if x['name']=='$SKILL_NAME']; print(s[0]['version'] if s else '')" 2>/dev/null)
if [ -z "$LATEST_VER" ] || [ "$LATEST_VER" = "$INSTALLED_VER" ]; then exit 0; fi
DEST_MD="$PROJECT_PATH/.github/skills/$SKILL_NAME/skill.md"
mkdir -p "$(dirname "$DEST_MD")"
curl -sf -H "Authorization: token $GH_TOKEN" "$PAGES_URL/skills/$SKILL_NAME/skill.md" -o "$DEST_MD"
sed -i.bak "s/\"version\": \"$INSTALLED_VER\"/\"version\": \"$LATEST_VER\"/" "$CONFIG_FILE" && rm -f "${CONFIG_FILE}.bak"
# Notify
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"Skill '$SKILL_NAME' updated to v$LATEST_VER\" with title \"CrestronAISkills\"" 2>/dev/null
else
    notify-send "CrestronAISkills" "Skill '$SKILL_NAME' updated to v$LATEST_VER" 2>/dev/null
fi
UPDATESCRIPT
sed -i.bak "s/__SKILL_NAME__/$SKILL_NAME/g" "$UPDATE_SCRIPT" && rm -f "${UPDATE_SCRIPT}.bak"
chmod +x "$UPDATE_SCRIPT"
echo "  Update script saved to $UPDATE_SCRIPT"

# 6. Register scheduler (cron on Linux, launchd on Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLIST_NAME="com.crestron.skill.$SKILL_NAME"
    PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
    cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$PLIST_NAME</string>
  <key>ProgramArguments</key><array><string>bash</string><string>$UPDATE_SCRIPT</string></array>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><false/>
</dict></plist>
PLIST
    launchctl load "$PLIST_PATH" 2>/dev/null
    echo "  launchd agent registered (weekly Monday 9am)"
else
    CRON_LINE="0 9 * * 1 bash \"$UPDATE_SCRIPT\" >> /tmp/crestron-skill-update.log 2>&1"
    ( crontab -l 2>/dev/null | grep -v "$UPDATE_SCRIPT"; echo "$CRON_LINE" ) | crontab -
    echo "  cron job registered (weekly Monday 9am)"
fi

echo ""
echo "✅ Done! Installed to: $DEST_MD"
echo "   Auto-updates scheduled every Monday at 9am."
echo ""


