/**
 * workflow-homebrew-guard.cjs — Add HOMEBREW_TAP_TOKEN guard to build.yml
 *
 * Ensures the bump homebrew tap job has a guard that skips it when
 * HOMEBREW_TAP_TOKEN is not configured as a repository secret.
 *
 * Idempotent — safe to run multiple times; skips if already present.
 *
 * Usage: node scripts/patches/workflow-homebrew-guard.cjs
 */
const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../../.github/workflows/build.yml");

if (!fs.existsSync(file)) {
  console.error("[homebrew-guard] build.yml not found at " + file);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");
let modified = false;

// 1. Add the secrets.HOMEBREW_TAP_TOKEN guard to the if condition
if (!content.includes("secrets.HOMEBREW_TAP_TOKEN")) {
  // Find the line with the if condition for the homebrew-tap job
  // and add the guard after the publish_release check
  const lines = content.split(String.fromCharCode(10));
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes("github.event_name == 'push' || (github.event_name == 'workflow_dispatch'") &&
      lines[i].includes("inputs.publish_release)") &&
      !lines[i].includes("HOMEBREW_TAP_TOKEN")
    ) {
      lines[i] = lines[i] + String.fromCharCode(10) + "      && secrets.HOMEBREW_TAP_TOKEN != ''";
      modified = true;
      break;
    }
  }
  content = lines.join(String.fromCharCode(10));
}

// 2. Add the comment explaining the guard
if (!content.includes("Also skips when HOMEBREW_TAP_TOKEN")) {
  const lines = content.split(String.fromCharCode(10));
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("are skipped so brew users stay on stable.") && !lines[i].includes("HOMEBREW_TAP_TOKEN")) {
      lines.splice(i + 1, 0,
        "    # Also skips when HOMEBREW_TAP_TOKEN is not configured — the cask",
        "    # can be bumped manually or via a separate process."
      );
      modified = true;
      break;
    }
  }
  content = lines.join(String.fromCharCode(10));
}

if (modified) {
  fs.writeFileSync(file, content);
  console.log("[homebrew-guard] Patched .github/workflows/build.yml");
} else {
  console.log("[homebrew-guard] Already patched — skipping");
}
