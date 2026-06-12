#!/usr/bin/env bash
# CrestronAISkills - Check for skill updates (Mac/Linux)
# Run this script manually to check all installed skills for available updates.
# Usage: bash ~/.copilot/skills/check-updates.sh

REGISTRY_URL="https://crestron.github.io/CrestronAISkills/registry.json"
PAGES_URL="https://crestron.github.io/CrestronAISkills"
CONFIG_DIR="$HOME/.copilot/skills"

echo ""
echo "CrestronAISkills — Checking for updates..."
echo "──────────────────────────────────────────────────"

configs=("$CONFIG_DIR"/*-config.json)
if [ ! -f "${configs[0]}" ]; then
    echo "No installed skills found. Download and run install.sh from the marketplace."
    exit 0
fi

REGISTRY=$(curl -sf "$REGISTRY_URL")
if [ -z "$REGISTRY" ]; then
    echo "ERROR: Could not fetch registry from $REGISTRY_URL"
    exit 1
fi

for CONFIG_FILE in "$CONFIG_DIR"/*-config.json; do
    NAME=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d['name'])" 2>/dev/null || grep '"name"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
    VERSION=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d['version'])" 2>/dev/null || grep '"version"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
    PROJECT_PATH=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d['projectPath'])" 2>/dev/null || grep '"projectPath"' "$CONFIG_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
    COPILOT_DEST="$PROJECT_PATH/.github/skills/$NAME/skill.md"
    CLAUDE_DEST="$PROJECT_PATH/.claude/commands/$NAME.md"

    LATEST=$(echo "$REGISTRY" | python3 -c "import json,sys; r=json.load(sys.stdin); s=[x for x in r['skills'] if x['name']=='$NAME']; print(s[0]['version'] if s else '')" 2>/dev/null)

    if [ -z "$LATEST" ]; then
        echo "  ? $NAME — not found in registry"
        continue
    fi

    if [ "$LATEST" = "$VERSION" ]; then
        echo "  ✅ $NAME v$VERSION — up to date"
    else
        echo "  ⚠  $NAME — update available: v$VERSION → v$LATEST"
        echo "     Project: $PROJECT_PATH"
        read -rp "     Update now? (y/n): " answer
        if [[ "$answer" =~ ^[Yy] ]]; then
            TMP=$(mktemp)
            curl -sf "$PAGES_URL/skills/$NAME/skill.md" -o "$TMP"
            # Update Copilot skill
            mkdir -p "$(dirname "$COPILOT_DEST")"
            cp "$TMP" "$COPILOT_DEST"
            # Update Claude Code command if present
            if [ -f "$CLAUDE_DEST" ]; then
                awk '/^---$/{n++; next} n>=2{print}' "$TMP" > "$CLAUDE_DEST"
            fi
            rm -f "$TMP"
            python3 -c "
import json
with open('$CONFIG_FILE') as f: d=json.load(f)
d['version']='$LATEST'
with open('$CONFIG_FILE','w') as f: json.dump(d,f,indent=2)
" 2>/dev/null || sed -i.bak "s/\"version\": \"$VERSION\"/\"version\": \"$LATEST\"/" "$CONFIG_FILE" && rm -f "${CONFIG_FILE}.bak"
            echo "     ✅ Updated to v$LATEST"
        else
            echo "     Skipped."
        fi
    fi
done

echo ""
