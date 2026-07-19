const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const source = path.join(repoRoot, 'node_modules', 'monaco-editor', 'min', 'vs');
const target = path.join(repoRoot, 'public', 'monaco', 'vs');

if (!fs.existsSync(source)) {
  console.error('[copy-monaco] Source not found:', source);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log('[copy-monaco] Copied Monaco VS assets to', target);

// ── Sensor-specific patch ──────────────────────────────────────────────────
const shimPath = path.join(repoRoot, 'infrastructure', 'monaco', 'useSensorMonacoTheme.ts');
if (!fs.existsSync(shimPath)) {
  fs.writeFileSync(shimPath,
    '// Re-export shim — ScriptCodeEditor.tsx imports from this path.\n' +
    "export { useSensorMonacoTheme } from './useNetcattyMonacoTheme';\n"
  );
  console.log('[copy-monaco] Created useSensorMonacoTheme.ts shim');
}
