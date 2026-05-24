/**
 * electron-builder-signing.cjs — Apply conditional code signing to electron-builder.config.cjs
 *
 * The upstream (Netcatty) has hardcoded hardenedRuntime: true, notarize: true.
 * Sensor needs conditional signing based on CSC_LINK because we don't have
 * an Apple Developer certificate — without the fix, macOS Code Signing Monitor
 * kills the unsigned app on launch.
 *
 * Idempotent — safe to run multiple times; skips if already patched.
 *
 * Usage: node scripts/patches/electron-builder-signing.cjs
 */
const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../../electron-builder.config.cjs");

if (!fs.existsSync(file)) {
  console.error("[electron-builder-signing] electron-builder.config.cjs not found at " + file);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");
let modified = false;

// 1. Replace hardcoded hardenedRuntime with conditional
if (!content.includes("hardenedRuntime: !!process.env.CSC_LINK")) {
  content = content.replace(
    /hardenedRuntime: (true|false),/,
    "hardenedRuntime: !!process.env.CSC_LINK,"
  );
  modified = true;
}

// 2. Replace hardcoded notarize with false
if (content.match(/notarize: true,/)) {
  content = content.replace(/notarize: true,/, "notarize: false,");
  modified = true;
}

// 3. Add identity line after hardenedRuntime if not present
if (!content.includes("identity: process.env.CSC_LINK")) {
  content = content.replace(
    /(hardenedRuntime: !!process[.]env[.]CSC_LINK,)/,
    "$1" + String.fromCharCode(10) + "        identity: process.env.CSC_LINK ? undefined : null,"
  );
  modified = true;
}

// 4. Add comment block above hardenedRuntime if not present
if (!content.includes("When a Developer ID cert is available")) {
  content = content.replace(
    /(s+hardenedRuntime: !!process[.]env[.]CSC_LINK,)/,
    "        // When a Developer ID cert is available (CSC_LINK set), sign properly" + String.fromCharCode(10) +
    "        // with hardened runtime. When no cert is available, fall back to ad-hoc" + String.fromCharCode(10) +
    "        // signing in the afterPack hook — this prevents macOS Code Signing" + String.fromCharCode(10) +
    "        // Monitor from killing the app on launch (SIGKILL / Code Signature" + String.fromCharCode(10) +
    "        // Invalid). See scripts/afterPackMacUuid.cjs for details." + String.fromCharCode(10) +
    "$1"
  );
  modified = true;
}

if (modified) {
  fs.writeFileSync(file, content);
  console.log("[electron-builder-signing] Patched electron-builder.config.cjs");
} else {
  console.log("[electron-builder-signing] Already patched — skipping");
}
