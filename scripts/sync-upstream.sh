#!/usr/bin/env bash
#
# sync-upstream.sh — Sync Sensor from upstream Netcatty with rebranding
#
# Usage:
#   GITHUB_TOKEN=<pat> ./scripts/sync-upstream.sh [UPSTREAM_SHA]
#
# When UPSTREAM_SHA is provided, syncs from that specific commit.
# When omitted, syncs from the latest commit on upstream main.
#
# What this does:
#   1. Clones binaricat/Netcatty at the target SHA
#   2. Copies all files into the Sensor working tree
#   3. Applies rebranding substitutions (Netcatty→Sensor, etc.)
#   4. Applies Sensor-specific patches (code signing, ad-hoc signing, workflow)
#   5. Restores Sensor-specific binary assets (icons)
#   6. Shows diff for review — does NOT auto-commit
#
# Sensor-specific patches (in scripts/patches/) are preserved across syncs
# and re-applied automatically. They are idempotent — safe to run repeatedly.
set -euo pipefail

UPSTREAM_REPO="binaricat/Netcatty"
UPSTREAM_SHA="${1:-}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "::error::GITHUB_TOKEN env var required for upstream access"
  exit 1
fi

# If arg looks like a SHA, use it
if [[ -n "${1:-}" ]] && [[ "${1:-}" =~ ^[0-9a-f]{7,40}$ ]]; then
  UPSTREAM_SHA="$1"
fi

UPSTREAM_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${UPSTREAM_REPO}.git"
SENSOR_ROOT="$(git rev-parse --show-toplevel)"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "==> Cloning upstream ${UPSTREAM_REPO}..."
if [[ -n "$UPSTREAM_SHA" ]]; then
  git clone --single-branch "$UPSTREAM_URL" "$TMP/netcatty" 2>/dev/null
  (cd "$TMP/netcatty" && git checkout "$UPSTREAM_SHA" 2>/dev/null) || {
    echo "::error::Could not checkout upstream SHA ${UPSTREAM_SHA}"
    exit 1
  }
else
  git clone --depth=1 "$UPSTREAM_URL" "$TMP/netcatty" 2>/dev/null
  UPSTREAM_SHA=$(cd "$TMP/netcatty" && git rev-parse --short HEAD)
fi

UPSTREAM_FULL_SHA=$(cd "$TMP/netcatty" && git rev-parse HEAD)
echo "==> Upstream at: ${UPSTREAM_FULL_SHA} (${UPSTREAM_SHA})"

# --- Step 1: Save Sensor-specific files before overwriting ---
echo "==> Saving Sensor-specific files..."

SENSOR_SPECIFIC_FILES=(
  # Sensor brand icons (different from upstream)
  "build/icons/128x128.png"
  "build/icons/16x16.png"
  "build/icons/256x256.png"
  "build/icons/32x32.png"
  "build/icons/48x48.png"
  "build/icons/512x512.png"
  "build/icons/64x64.png"
  "public/icon.png"
  "public/icon.svg"
  "public/icon-win.png"
  "public/icon-win.svg"
  "public/logo.svg"
  "public/dmg-fix-icon.png"
  "public/tray-icon.png"
  "public/tray-icon@2x.png"
  "public/tray-iconTemplate.png"
  "public/tray-iconTemplate@2x.png"
  # Sensor-specific scripts (not in upstream)
  "scripts/sync-upstream.sh"
  "scripts/verify-macos-signing.sh"
  "scripts/patches"
)

BACKUP_DIR="$TMP/sensor_backup"
mkdir -p "$BACKUP_DIR"
for f in "${SENSOR_SPECIFIC_FILES[@]}"; do
  if [[ -e "$SENSOR_ROOT/$f" ]]; then
    mkdir -p "$(dirname "$BACKUP_DIR/$f")"
    cp -R "$SENSOR_ROOT/$f" "$BACKUP_DIR/$f"
  fi
done

# --- Step 2: Copy upstream files into Sensor ---
echo "==> Copying upstream files..."
rsync -a --delete --exclude='.git' --exclude='node_modules' --exclude='package-lock.json' --exclude='dist' --exclude='release' "$TMP/netcatty/" "$SENSOR_ROOT/"

# Restore Sensor-specific files
for f in "${SENSOR_SPECIFIC_FILES[@]}"; do
  if [[ -e "$BACKUP_DIR/$f" ]]; then
    mkdir -p "$(dirname "$SENSOR_ROOT/$f")"
    cp -R "$BACKUP_DIR/$f" "$SENSOR_ROOT/$f"
  fi
done

# --- Step 3: Rebranding substitutions ---
echo "==> Applying rebranding substitutions..."

find "$SENSOR_ROOT" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/release/*' -not -name '*.png' -not -name '*.ico' -not -name '*.icns' -not -name '*.exe' -not -name '*.dmg' -not -name '*.zip' -not -name '*.p12' -not -name '*.lock' -not -name 'sync-upstream.sh' -not -name 'verify-macos-signing.sh' -not -path '*/patches/*' | while read -r file; do
  if file "$file" | grep -qi text; then
    sed -i.bak -E '
      # appId (most specific first)
      s/com[.]netcatty[.]app/ng.hyperspace.sensor/g
      # Author email
      s/support@netcatty[.]com/sensor@hyperspace.ng/g
      # GitHub org/repo in URLs
      s|github[.]com/binaricat/Netcatty|github.com/DrOlu/Sensor|g
      # Product name (capitalized) — before lowercase
      s/Netcatty/Sensor/g
      # Standalone lowercase "netcatty" — not inside camelCase identifiers
      s/([^a-zA-Z])netcatty([^a-zA-Z])/@1sensor@2/g
      s/([^a-zA-Z])netcatty$/@1sensor/g
      s/^netcatty([^a-zA-Z])/sensor@1/g
      s/^netcatty$/sensor/g
      # Quoted lowercase (JSON strings, etc.)
      s/"netcatty"/"sensor"/g
      # HTML title
      s/>netcatty SSH</>Sensor SSH</g
      # Author/org name (after product name subs to avoid double-replace)
      s/binaricat/Hyperspace Technologies/g
    ' "$file"
    rm -f "${file}.bak"
  fi
done

# --- Step 4: Apply Sensor-specific patches ---
echo "==> Applying Sensor-specific patches..."
node "$SENSOR_ROOT/scripts/patches/electron-builder-signing.cjs"
node "$SENSOR_ROOT/scripts/patches/ad-hoc-signing.cjs"
node "$SENSOR_ROOT/scripts/patches/workflow-homebrew-guard.cjs"

# --- Done ---
echo ""
echo "==> Sync complete. Diff summary:"
git diff --stat
echo ""
echo "==> To commit and push:"
echo "    git add -A"
echo "    git commit -m 'sync: upstream Netcatty @ ${UPSTREAM_SHA} (rebranded)'"
echo "    git push origin main"
echo ""
echo "==> IMPORTANT: Review the diff before committing!"
echo "    Run: git diff"
