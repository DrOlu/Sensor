#!/usr/bin/env node
/**
 * sensor-patches.cjs — Sensor-specific fixes applied at install time.
 *
 * Run automatically via the `postinstall` npm hook (after every npm ci/install).
 * This ensures patches survive upstream syncs that overwrite build.yml or
 * .github/workflows files.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// -- Patch 1: useSensorMonacoTheme re-export shim --------------------------
// ScriptCodeEditor.tsx imports @/infrastructure/monaco/useSensorMonacoTheme.
// Upstream only ships useNetcattyMonacoTheme.ts (which already exports the
// function under the Sensor-branded name). Create the re-export shim if the
// upstream sync deleted it, so the vite build never fails with ENOENT.
const shimPath = path.join(root, 'infrastructure', 'monaco', 'useSensorMonacoTheme.ts');
const shimDir = path.dirname(shimPath);
if (!fs.existsSync(shimPath)) {
  fs.mkdirSync(shimDir, { recursive: true });
  fs.writeFileSync(
    shimPath,
    '// Re-export shim -- ScriptCodeEditor.tsx imports from this path.\n' +
    "export { useSensorMonacoTheme } from './useNetcattyMonacoTheme';\n"
  );
  console.log('[sensor-patches] Created useSensorMonacoTheme.ts shim');
} else {
  console.log('[sensor-patches] useSensorMonacoTheme.ts shim already present');
}

// ── Patch 2: verify app icon is Sensor brand (not upstream netcatty) ────────
// The Sensor icon (superagent_logo.svg rendered at 1024x1024) is ~27KB.
// The upstream netcatty icon is ~11KB (512x512). If the icon is small,
// log a warning — the sync-upstream.yml snapshot/restore should prevent
// this but this gives a visible signal in CI logs if it ever slips through.
const iconPath = path.join(root, 'public', 'icon.png');
if (fs.existsSync(iconPath)) {
  const iconSize = fs.statSync(iconPath).size;
  if (iconSize < 20000) {
    console.warn('[sensor-patches] WARNING: public/icon.png is ' + iconSize + ' bytes — may be the upstream 512px icon, not the Sensor 1024px icon.');
  } else {
    console.log('[sensor-patches] public/icon.png looks correct (' + iconSize + ' bytes)');
  }
}
