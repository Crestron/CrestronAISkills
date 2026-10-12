#!/usr/bin/env bash
# Sync a skill from a team's repo into CrestronAISkills from your own machine and open (or update)
# the sync PR. Local equivalent of .github/workflows/sync-skill.yml — use it when the workflow can't
# reach the source repo (e.g. the CrestronEng org's IP allow list blocks GitHub-hosted runners).
# Run from an allow-listed network (office or VPN).
#
# Runs the same .github/scripts/sync-skill.js as the workflow in a temporary folder (your working copy
# is never touched), pushes sync/<name>, and opens the PR. A PR pushed by you triggers the full CI.
# If sync/<name> already has an open PR, it updates that PR instead.
#
# Usage:
#   ./scripts/sync-skill-local.sh --source-repo CrestronEng/CrestronAutoSDLC \
#       --source-path dotgithub-contents/skills/design-review [--source-ref <40-char sha>] [--name <skill>] [--dry-run]
set -euo pipefail

TARGET_REPO="Crestron/CrestronAISkills"
SOURCE_REPO="" SOURCE_PATH="" SOURCE_REF="" NAME="" DRY_RUN=0

fail() { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
step() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
usage() { sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --source-repo) SOURCE_REPO="${2:-}"; shift 2 ;;
    --source-path) SOURCE_PATH="${2:-}"; shift 2 ;;
    --source-ref)  SOURCE_REF="${2:-}"; shift 2 ;;
    --name)        NAME="${2:-}"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     usage ;;
    *) fail "Unknown option: $1 (see --help)" ;;
  esac
done
[ -n "$SOURCE_REPO" ] && [ -n "$SOURCE_PATH" ] || usage

step "Checking prerequisites"
for tool in git node npm gh; do command -v "$tool" >/dev/null 2>&1 || fail "'$tool' is not installed or not on PATH."; done
gh auth status >/dev/null 2>&1 || fail "GitHub CLI is not signed in. Run: gh auth login"

[[ "$SOURCE_REPO" =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]] || fail "--source-repo must be owner/repo, got '$SOURCE_REPO'."
[ -n "$NAME" ] || NAME="$(basename "${SOURCE_PATH%/}")"
[[ "$NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]] || fail "Skill name '$NAME' must be lowercase letters/digits with hyphens."
BRANCH="sync/$NAME"

if [ -z "$SOURCE_REF" ]; then
  step "Looking up the latest commit on $SOURCE_REPO"
  SOURCE_REF="$(gh api "repos/$SOURCE_REPO/commits/HEAD" --jq .sha)" \
    || fail "Can't read $SOURCE_REPO. Check you have access, and that you're on VPN if the org has an IP allow list."
fi
[[ "$SOURCE_REF" =~ ^[0-9a-f]{40}$ ]] || fail "--source-ref must be a full 40-character commit SHA, got '$SOURCE_REF'."
echo "Source: $SOURCE_REPO@$SOURCE_REF : $SOURCE_PATH -> skills/$NAME/"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/skill-sync-$NAME-XXXXXX")"
KEEP=0
cleanup() { [ "$KEEP" = 1 ] || rm -rf "$WORK"; }
trap cleanup EXIT
SKILLS_REPO="$WORK/skills-repo"
SOURCE="$WORK/source"

step "Cloning $TARGET_REPO (main)"
git clone --quiet --depth 1 --branch main "https://github.com/$TARGET_REPO.git" "$SKILLS_REPO"
git -C "$SKILLS_REPO" switch --quiet -C "$BRANCH"

step "Fetching $SOURCE_REPO at $SOURCE_REF"
git init --quiet "$SOURCE"
git -C "$SOURCE" fetch --quiet --depth 1 "https://github.com/$SOURCE_REPO.git" "$SOURCE_REF"
git -C "$SOURCE" checkout --quiet FETCH_HEAD

step "Running the sync script"
cd "$SKILLS_REPO"
npm ci --ignore-scripts --no-fund --no-audit --loglevel=error
SOURCE_DIR="$SOURCE" SOURCE_PATH="$SOURCE_PATH" TARGET_NAME="$NAME" SOURCE_REPO="$SOURCE_REPO" SOURCE_REF="$SOURCE_REF" \
  node .github/scripts/sync-skill.js

git add "skills/$NAME" "copilot-skills/$NAME"
if git diff --staged --quiet; then
  printf '\n\033[33mNo changes: skills/%s already matches %s@%s.\033[0m\n' "$NAME" "$SOURCE_REPO" "$SOURCE_REF"
  exit 0
fi
git commit --quiet -m "sync: update $NAME from $SOURCE_REPO@$SOURCE_REF"

if [ "$DRY_RUN" = 1 ]; then
  KEEP=1
  printf '\n\033[33mDry run: committed locally, not pushed. Inspect: %s\033[0m\n' "$SKILLS_REPO"
  git --no-pager show --stat HEAD
  exit 0
fi

EXISTING="$(gh pr list --repo "$TARGET_REPO" --head "$BRANCH" --base main --state open --json url --jq '.[0].url')"
step "Pushing $BRANCH"
git push --quiet --force origin "$BRANCH"

if [ -n "$EXISTING" ]; then
  printf '\n\033[32mUpdated existing PR: %s\033[0m\n' "$EXISTING"
else
  BODY="$(printf 'Mirrors `%s` from [`%s`](https://github.com/%s)@`%s`.\n\nIf this is a new skill, `validate-skill.yml` will list the Crestron-only compliance metadata (scope, test-strategy, approved-by, etc.) that still needs filling in before this can merge -- this is expected, not a bug.\n\n_Synced from a local machine with `scripts/sync-skill-local.sh` (the source repo isn'"'"'t reachable from GitHub-hosted runners)._\n' \
    "$NAME" "$SOURCE_REPO" "$SOURCE_REPO" "$SOURCE_REF")"
  step "Opening PR"
  URL="$(gh pr create --repo "$TARGET_REPO" --base main --head "$BRANCH" --title "sync: import $NAME from $SOURCE_REPO" --body "$BODY")"
  printf '\n\033[32mOpened PR: %s\033[0m\n' "$URL"
fi
echo "Validate Skill, Test Skill and Test Tooling start on the PR within a minute."
