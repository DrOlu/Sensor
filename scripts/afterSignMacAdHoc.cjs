/**
 * electron-builder afterSign hook — apply ad-hoc codesign to the macOS app.
 *
 * When identity: null is set, electron-builder skips signing entirely,
 * shipping an unsigned .app. Native binaries (node-pty, mosh, etc.) then
 * fail to execute on macOS without the user manually running:
 *   codesign --force --deep --sign - /Applications/Sensor.app
 *
 * This hook automates that step at build time so the DMG ships with an
 * ad-hoc signature already applied.
 *
 * Guard: if CSC_LINK is set a real Developer ID cert is in use — skip
 * ad-hoc so we don't clobber the real signature.
 */
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

/** @param {import('electron-builder').AfterPackContext} context */
async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  if (process.env.CSC_LINK) {
    console.log('[afterSign] CSC_LINK is set — skipping ad-hoc signing.');
    return;
  }

  const productFilename = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productFilename}.app`);

  console.log(`[afterSign] Applying ad-hoc codesign to: ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  console.log('[afterSign] Ad-hoc codesign complete.');
}

module.exports = afterSign;
module.exports.default = afterSign;
