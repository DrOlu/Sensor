/**
 * workflow-homebrew-guard.cjs — Add HOMEBREW_TAP_TOKEN guard to build.yml
 *
 * Ensures the bump homebrew tap job gracefully skips when HOMEBREW_TAP_TOKEN
 * is not configured as a repository secret. Uses a step-level check instead
 * of a job-level secrets condition (which is invalid in GitHub Actions).
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

// 1. Remove invalid secrets.HOMEBREW_TAP_TOKEN from job if condition
//    (secrets context is not available in job-level if)
if (content.includes("secrets.HOMEBREW_TAP_TOKEN != ''")) {
  content = content.replace(/n      && secrets[.]HOMEBREW_TAP_TOKEN != ''/g, "");
  modified = true;
}

// 2. Add the Check HOMEBREW_TAP_TOKEN step before the Bump Cask step
if (!content.includes("Check HOMEBREW_TAP_TOKEN")) {
  content = content.replace(
    "      - name: Bump Cask in binaricat/homebrew-netcatty",
    "      - name: Check HOMEBREW_TAP_TOKEN" + String.fromCharCode(10) +
    "        env:" + String.fromCharCode(10) +
    "          HOMEBREW_TAP_TOKEN: ${{ secrets.HOMEBREW_TAP_TOKEN }}" + String.fromCharCode(10) +
    "        run: |" + String.fromCharCode(10) +
    "          if [[ -z "$HOMEBREW_TAP_TOKEN" ]]; then" + String.fromCharCode(10) +
    '            echo "::warning::HOMEBREW_TAP_TOKEN is not configured — skipping homebrew tap bump."' + String.fromCharCode(10) +
    '            echo "The cask can be bumped manually or by adding the secret to the repo."' + String.fromCharCode(10) +
    "            exit 0" + String.fromCharCode(10) +
    "          fi" + String.fromCharCode(10) +
    String.fromCharCode(10) +
    "      - name: Bump Cask in binaricat/homebrew-netcatty"
  );
  modified = true;
}

// 3. Add the comment explaining the guard
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
