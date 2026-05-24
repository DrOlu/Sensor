#!/usr/bin/env bash
#
# verify-macos-signing.sh — Verify macOS code signing config is present
#
# This script checks that the Sensor-specific macOS code signing overrides
# are present in the codebase. It runs in CI to catch cases where an
# upstream sync accidentally removes the ad-hoc signing fix.
#
# Run locally:  ./scripts/verify-macos-signing.sh
# Run in CI:    Added as a job in .github/workflows/build.yml
#
# Exit 0 if all checks pass, exit 1 if any check fails.
set -euo pipefail

SENSOR_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$(dirname "$0")/.." && pwd)")"
ERRORS=0

echo "==> Verifying macOS code signing configuration..."

# Check 1: electron-builder.config.cjs has conditional hardenedRuntime
if ! grep -q "hardenedRuntime: !!process.env.CSC_LINK" "$SENSOR_ROOT/electron-builder.config.cjs"; then
  echo "::error::electron-builder.config.cjs is missing conditional hardenedRuntime."
  echo "  Expected: hardenedRuntime: !!process.env.CSC_LINK,"
  echo "  This likely means an upstream sync overwrote the Sensor-specific override."
  echo "  Fix: Run ./scripts/sync-upstream.sh or node scripts/patches/electron-builder-signing.cjs"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: electron-builder.config.cjs has conditional hardenedRuntime"
fi

# Check 2: electron-builder.config.cjs has conditional identity
if ! grep -q "identity: process.env.CSC_LINK" "$SENSOR_ROOT/electron-builder.config.cjs"; then
  echo "::error::electron-builder.config.cjs is missing conditional identity."
  echo "  Expected: identity: process.env.CSC_LINK ? undefined : null,"
  echo "  This likely means an upstream sync overwrote the Sensor-specific override."
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: electron-builder.config.cjs has conditional identity"
fi

# Check 3: afterPackMacUuid.cjs has ad-hoc signing code
if ! grep -q "ad-hoc signing" "$SENSOR_ROOT/scripts/afterPackMacUuid.cjs"; then
  echo "::error::scripts/afterPackMacUuid.cjs is missing ad-hoc code signing."
  echo "  Without this, macOS Code Signing Monitor kills the app on launch."
  echo "  Fix: Run node scripts/patches/ad-hoc-signing.cjs to inject it."
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: scripts/afterPackMacUuid.cjs has ad-hoc signing"
fi

# Check 4: afterPackMacUuid.cjs has codesign invocation
if ! grep -q '"codesign"' "$SENSOR_ROOT/scripts/afterPackMacUuid.cjs"; then
  echo "::error::scripts/afterPackMacUuid.cjs is missing codesign invocation."
  echo "  Expected: execFileSync('codesign', ...) with --sign -"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: scripts/afterPackMacUuid.cjs has codesign invocation"
fi

# Check 5: build.yml has HOMEBREW_TAP_TOKEN guard (warn only)
if ! grep -q "secrets.HOMEBREW_TAP_TOKEN" "$SENSOR_ROOT/.github/workflows/build.yml"; then
  echo "::warning::build.yml is missing HOMEBREW_TAP_TOKEN guard."
  echo "  Without this, the bump homebrew tap job fails when the secret is not configured."
  echo "  Fix: Run node scripts/patches/workflow-homebrew-guard.cjs"
else
  echo "  OK: build.yml has HOMEBREW_TAP_TOKEN guard"
fi

echo ""
if [[ $ERRORS -gt 0 ]]; then
  echo "::error::${ERRORS} check(s) failed. macOS code signing config is broken."
  echo ""
  echo "This likely happened because an upstream sync overwrote Sensor-specific overrides."
  echo "To fix: re-run the sync script which applies the patches automatically:"
  echo "  GITHUB_TOKEN=<pat> ./scripts/sync-upstream.sh"
  echo ""
  echo "Or apply individual patches:"
  echo "  node scripts/patches/electron-builder-signing.cjs"
  echo "  node scripts/patches/ad-hoc-signing.cjs"
  exit 1
else
  echo "All checks passed. macOS code signing config is intact."
  exit 0
fi
