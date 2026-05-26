/**
 * electron-builder custom mac.sign function — ad-hoc codesign.
 *
 * electron-builder's afterSign hook is NOT called when identity: null
 * causes signing to be skipped entirely. The mac.sign custom function
 * IS always called by electron-builder before it packages the .app into
 * a DMG or zip, regardless of identity setting.
 *
 * This applies `codesign --force --deep --sign -` (ad-hoc identity) so
 * the .app bundle is signed before packaging. Without this, native
 * binaries (node-pty, mosh-client) fail to execute on macOS and the
 * user must manually re-sign after install.
 *
 * Guard: if CSC_LINK is set a real Developer ID cert is in use —
 * defer to electron-builder's normal signing path instead.
 */
'use strict';

const { execFileSync } = require('node:child_process');

/**
 * @param {{ appPath: string, isMas: boolean, options: object }} config
 */
async function sign(config) {
  // Real cert present — let electron-builder handle it normally.
  if (process.env.CSC_LINK) {
    console.log('[sign] CSC_LINK is set — deferring to electron-builder default signing.');
    return;
  }

  const { appPath } = config;
  console.log(`[sign] Applying ad-hoc codesign to: ${appPath}`);

  execFileSync(
    'codesign',
    ['--force', '--deep', '--sign', '-', appPath],
    { stdio: 'inherit' }
  );

  console.log('[sign] Ad-hoc codesign complete.');
}

module.exports = sign;
module.exports.default = sign;
