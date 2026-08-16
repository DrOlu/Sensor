#!/usr/bin/env node
/**
 * sensor-patches.cjs - Sensor-specific patches applied at install/build time.
 * Called from postinstall and prebuild npm scripts.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = process.cwd();

// Patch 1: useSensorMonacoTheme shim
// Both ScriptCodeEditor.tsx and TextEditorPane.tsx import from this path.
// Upstream only has useNetcattyMonacoTheme.ts.
const shimPath = path.join(root, 'infrastructure', 'monaco', 'useSensorMonacoTheme.ts');
if (!fs.existsSync(shimPath)) {
  fs.mkdirSync(path.dirname(shimPath), { recursive: true });
  fs.writeFileSync(
    shimPath,
    ['// Re-export shim.', "export { useSensorMonacoTheme } from './useNetcattyMonacoTheme';"].join(os.EOL) + os.EOL
  );
  console.log('[sensor-patches] Created useSensorMonacoTheme.ts shim');
} else {
  console.log('[sensor-patches] useSensorMonacoTheme.ts shim already present');
}
