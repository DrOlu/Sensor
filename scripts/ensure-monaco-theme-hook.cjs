/**
 * ensure-monaco-theme-hook.cjs
 *
 * The rebrand pipeline (a brand-name find-and-replace across the tree)
 * renames the *import path* in ScriptCodeEditor.tsx to point at
 *   @/infrastructure/monaco/useSensorMonacoTheme
 * but does NOT rename the file on disk.  Every upstream sync re-introduces
 * the mismatch, breaking the vite build with ENOENT.
 *
 * This prebuild script creates a copy of whatever the actual Monaco theme
 * hook file is named, at the path the (rebranded) importer expects.  It uses
 * a glob/regex that contains neither brand name, so the rebrand sed pass
 * leaves it untouched and it keeps working after every sync.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'infrastructure', 'monaco');
const target = path.join(dir, 'useSensorMonacoTheme.ts');

if (fs.existsSync(target)) {
  // Already present (manual fix or a previous run) — nothing to do.
  process.exit(0);
}

if (!fs.existsSync(dir)) {
  // Monaco dir not present — nothing to fix.
  process.exit(0);
}

// Find the actual theme hook file — matches use<Anything>MonacoTheme.ts
// without hard-coding the brand name, so the rebrand can't break this glob.
const candidate = fs
  .readdirSync(dir)
  .find(
    (f) =>
      f.endsWith('.ts') &&
      /^use\w*MonacoTheme\.ts$/.test(f) &&
      f !== 'useSensorMonacoTheme.ts',
  );

if (candidate) {
  fs.copyFileSync(path.join(dir, candidate), target);
  console.log(
    `[ensure-monaco-theme-hook] Copied ${candidate} -> useSensorMonacoTheme.ts`,
  );
} else {
  console.warn(
    '[ensure-monaco-theme-hook] No use*MonacoTheme.ts file found — skipping.',
  );
}
