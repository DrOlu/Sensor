const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildSensorSkillsOpenCodePathAllowlist,
  buildOpenCodeSkillsPermissionRules,
  toOpenCodeDirectoryPermissionPatterns,
  toOpenCodeDirectoryGlob,
  toOpenCodeFileParentPermissionPatterns,
  toOpenCodeFileParentGlob,
} = require("./netcattySkillsOpenCodePermissions.cjs");

test("toOpenCodeFileParentGlob maps files to parent directory globs", () => {
  assert.equal(
    toOpenCodeFileParentGlob("/Applications/Sensor.app/Contents/MacOS/netcatty-tool-cli"),
    "/Applications/Sensor.app/Contents/MacOS/**",
  );
  assert.equal(
    toOpenCodeFileParentGlob("/tmp/netcatty/skills/netcatty-tool-cli/SKILL.md"),
    "/tmp/netcatty/skills/netcatty-tool-cli/**",
  );
});

test("toOpenCodeDirectoryGlob keeps directory roots stable when missing on disk", () => {
  assert.equal(
    toOpenCodeDirectoryGlob("/Users/me/Library/Application Support/netcatty/netcatty-tool-cli"),
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**",
  );
});

test("toOpenCodeDirectoryPermissionPatterns includes exact and wildcard forms", () => {
  assert.deepEqual(
    toOpenCodeDirectoryPermissionPatterns("/Users/me/Library/Application Support/netcatty/netcatty-tool-cli"),
    [
      "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli",
      "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/*",
      "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**",
    ],
  );
});

test("toOpenCodeFileParentPermissionPatterns normalizes Windows paths", () => {
  assert.deepEqual(
    toOpenCodeFileParentPermissionPatterns(
      "C:\\Users\\me\\AppData\\Local\\Programs\\Sensor\\resources\\app.asar.unpacked\\electron\\cli\\netcatty-tool-cli.cmd",
      { platform: "win32", pathModule: path.win32 },
    ),
    [
      "C:/Users/me/AppData/Local/Programs/Sensor/resources/app.asar.unpacked/electron/cli",
      "C:/Users/me/AppData/Local/Programs/Sensor/resources/app.asar.unpacked/electron/cli/*",
      "C:/Users/me/AppData/Local/Programs/Sensor/resources/app.asar.unpacked/electron/cli/**",
    ],
  );
});

test("buildSensorSkillsOpenCodePathAllowlist dedupes launcher and script roots", () => {
  const launcher = "/Applications/Sensor.app/Contents/MacOS/netcatty-tool-cli";
  const script = "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/electron/cli/netcatty-tool-cli.cjs";
  const skill = "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/skills/netcatty-tool-cli/SKILL.md";
  const patterns = buildSensorSkillsOpenCodePathAllowlist({
    launcherPath: launcher,
    cliScriptPath: script,
    skillPath: skill,
    discoveryFilePath: "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/discovery.json",
    cliStateDir: "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli",
  });

  assert.deepEqual(patterns, [
    "/Applications/Sensor.app/Contents/MacOS",
    "/Applications/Sensor.app/Contents/MacOS/*",
    "/Applications/Sensor.app/Contents/MacOS/**",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/electron/cli",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/electron/cli/*",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/electron/cli/**",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/skills/netcatty-tool-cli",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/skills/netcatty-tool-cli/*",
    "/Applications/Sensor.app/Contents/Resources/app.asar.unpacked/skills/netcatty-tool-cli/**",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/*",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**",
  ]);
});

test("buildSensorSkillsOpenCodePathAllowlist includes temp dir and extra attachment paths", () => {
  const patterns = buildSensorSkillsOpenCodePathAllowlist({
    discoveryFilePath: "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/discovery.json",
    tempDir: "/var/folders/tmp/Sensor",
    extraFilePaths: ["/var/folders/tmp/Sensor/ai-attachment-1.png"],
  });

  assert.deepEqual(patterns, [
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/*",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**",
    "/var/folders/tmp/Sensor",
    "/var/folders/tmp/Sensor/*",
    "/var/folders/tmp/Sensor/**",
  ]);
});

test("buildSensorSkillsOpenCodePathAllowlist includes OpenCode-compatible Windows directory resources", () => {
  const patterns = buildSensorSkillsOpenCodePathAllowlist({
    launcherPath: "C:\\Users\\me\\AppData\\Local\\Programs\\Sensor\\resources\\app.asar.unpacked\\electron\\cli\\netcatty-tool-cli.cmd",
    cliScriptPath: "C:\\Users\\me\\AppData\\Local\\Programs\\Sensor\\resources\\app.asar.unpacked\\electron\\cli\\netcatty-tool-cli.cjs",
    skillPath: "C:\\Users\\me\\AppData\\Local\\Programs\\Sensor\\resources\\app.asar.unpacked\\skills\\netcatty-tool-cli\\SKILL.md",
    discoveryFilePath: "C:\\Users\\me\\AppData\\Roaming\\netcatty\\netcatty-tool-cli\\discovery.json",
    runtimeBinaryPath: "C:\\Users\\me\\AppData\\Local\\Programs\\Sensor\\Sensor.exe",
    tempDir: "C:\\Users\\me\\AppData\\Local\\Temp\\Sensor",
    extraFilePaths: ["C:\\Users\\me\\AppData\\Local\\Temp\\Sensor\\attachment.png"],
  }, { platform: "win32", pathModule: path.win32 });

  assert.equal(patterns.includes("C:/Users/me/AppData/Local/Programs/Sensor/resources/app.asar.unpacked/electron/cli/*"), true);
  assert.equal(patterns.includes("C:/Users/me/AppData/Roaming/netcatty/netcatty-tool-cli/*"), true);
  assert.equal(patterns.includes("C:/Users/me/AppData/Local/Temp/Sensor/*"), true);
  assert.equal(patterns.includes("C:/Users/me/AppData/Local/Programs/Sensor/*"), true);
});

test("buildOpenCodeSkillsPermissionRules allowlists Sensor CLI paths and denies other external access", () => {
  const rules = buildOpenCodeSkillsPermissionRules([
    "/Applications/Sensor.app/Contents/MacOS/**",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**",
  ]);

  assert.equal(rules.bash, "allow");
  assert.equal(rules.skill, "allow");
  assert.equal(rules.list, "deny");
  assert.deepEqual(rules.external_directory, {
    "/Applications/Sensor.app/Contents/MacOS/**": "allow",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**": "allow",
    "*": "deny",
  });
  assert.deepEqual(rules.read, {
    "/Applications/Sensor.app/Contents/MacOS/**": "allow",
    "/Users/me/Library/Application Support/netcatty/netcatty-tool-cli/**": "allow",
  });
});
