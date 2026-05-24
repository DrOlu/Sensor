/**
 * ad-hoc-signing.cjs — Inject ad-hoc code signing into afterPackMacUuid.cjs
 *
 * Idempotent — safe to run multiple times; skips if already patched.
 *
 * Usage: node scripts/patches/ad-hoc-signing.cjs
 */
const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../afterPackMacUuid.cjs");

if (!fs.existsSync(file)) {
  console.error("[ad-hoc-signing] afterPackMacUuid.cjs not found");
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");

if (content.includes("ad-hoc signing")) {
  console.log("[ad-hoc-signing] Already patched — skipping");
  process.exit(0);
}

// Add execFileSync import
if (!content.includes("execFileSync")) {
  content = content.replace(
    'const crypto = require("node:crypto");',
    'const crypto = require("node:crypto");' +
    String.fromCharCode(10) +
    'const { execFileSync } = require("node:child_process");'
  );
}

// Read the ad-hoc signing block from a separate file to avoid escaping issues
const blockFile = path.resolve(__dirname, "ad-hoc-signing-block.txt");
let block = fs.readFileSync(blockFile, "utf8");

// Find the closing } of the afterPack function (last } before module.exports)
const moduleExportsIndex = content.lastIndexOf("module.exports");
if (moduleExportsIndex === -1) {
  console.error("[ad-hoc-signing] Could not find module.exports");
  process.exit(1);
}

let insertIndex = moduleExportsIndex - 1;
while (insertIndex >= 0 && content[insertIndex] !== "}") insertIndex--;
if (insertIndex < 0) {
  console.error("[ad-hoc-signing] Could not find closing brace of afterPack");
  process.exit(1);
}

content = content.slice(0, insertIndex) + block + content.slice(insertIndex);

fs.writeFileSync(file, content);
console.log("[ad-hoc-signing] Injected ad-hoc signing into afterPackMacUuid.cjs");
