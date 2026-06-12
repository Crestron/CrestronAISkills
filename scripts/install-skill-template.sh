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

# Parse arguments: --project <path>
ARG_PROJECT=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --project) ARG_PROJECT="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# 1. Get project path
if [ -n "$ARG_PROJECT" ]; then
    PROJECT_PATH="$ARG_PROJECT"
else
    DEFAULT_PATH=$(pwd)
    echo ""
    read -rp "Enter your project root path (press Enter for: $DEFAULT_PATH): " PROJECT_PATH
    if [ -z "$PROJECT_PATH" ]; then PROJECT_PATH="$DEFAULT_PATH"; fi
fi
if [ ! -d "$PROJECT_PATH" ]; then echo "ERROR: Path not found: $PROJECT_PATH"; exit 1; fi
PROJECT_PATH=$(cd "$PROJECT_PATH" && pwd)
echo "  Project path: $PROJECT_PATH"

# 2. Install skill.md to .github/skills/<name>/
SKILLS_FOLDER="$PROJECT_PATH/.github/skills/$SKILL_NAME"
mkdir -p "$SKILLS_FOLDER"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_MD="$SKILLS_FOLDER/skill.md"
cp "$SCRIPT_DIR/skill.md" "$DEST_MD"
echo "  Installed to $DEST_MD"

# 3. Save config
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

# 3b. Download check-updates scripts to config dir
curl -sf "$PAGES_URL/scripts/check-updates.ps1" -o "$CONFIG_DIR/check-updates.ps1" && echo "  check-updates.ps1 saved to $CONFIG_DIR/check-updates.ps1" || echo "  Warning: could not download check-updates.ps1"
curl -sf "$PAGES_URL/scripts/check-updates.sh" -o "$CONFIG_DIR/check-updates.sh" && chmod +x "$CONFIG_DIR/check-updates.sh" && echo "  check-updates.sh saved to $CONFIG_DIR/check-updates.sh" || echo "  Warning: could not download check-updates.sh"

# 4. Write update script
UPDATE_SCRIPT="$CONFIG_DIR/update-$SKILL_NAME.sh"
cat > "$UPDATE_SCRIPT" <<'UPDATESCRIPT'
#!/usr/bin/env bash
CONFIG_DIR="$HOME/.copilot/skills"
CONFIG_FILE="$CONFIG_DIR/__SKILL_NAME__-config.json"
SKILL_NAME=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['name'])" 2>/dev/null || grep '"name"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
INSTALLED_VER=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['version'])" 2>/dev/null || grep '"version"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
REGISTRY_URL=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['registryUrl'])" 2>/dev/null || grep '"registryUrl"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PAGES_URL=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['pagesUrl'])" 2>/dev/null || grep '"pagesUrl"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PROJECT_PATH=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['projectPath'])" 2>/dev/null || grep '"projectPath"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
REGISTRY=$(curl -sf "$REGISTRY_URL")
if [ -z "$REGISTRY" ]; then exit 1; fi
LATEST_VER=$(echo "$REGISTRY" | python3 -c "import json,sys; r=json.load(sys.stdin); s=[x for x in r['skills'] if x['name']=='$SKILL_NAME']; print(s[0]['version'] if s else '')" 2>/dev/null)
if [ -z "$LATEST_VER" ] || [ "$LATEST_VER" = "$INSTALLED_VER" ]; then exit 0; fi
DEST_MD="$PROJECT_PATH/.github/skills/$SKILL_NAME/skill.md"
mkdir -p "$(dirname "$DEST_MD")"
curl -sf "$PAGES_URL/skills/$SKILL_NAME/skill.md" -o "$DEST_MD"
sed -i.bak "s/\"version\": \"$INSTALLED_VER\"/\"version\": \"$LATEST_VER\"/" "$CONFIG_FILE" && rm -f "${CONFIG_FILE}.bak"
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"Skill '$SKILL_NAME' updated to v$LATEST_VER\" with title \"CrestronAISkills\"" 2>/dev/null
else
    notify-send "CrestronAISkills" "Skill '$SKILL_NAME' updated to v$LATEST_VER" 2>/dev/null
fi
UPDATESCRIPT
sed -i.bak "s/__SKILL_NAME__/$SKILL_NAME/g" "$UPDATE_SCRIPT" && rm -f "${UPDATE_SCRIPT}.bak"
chmod +x "$UPDATE_SCRIPT"
echo "  Update script saved to $UPDATE_SCRIPT"

# 5. Register scheduler (cron on Linux, launchd on Mac)
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
