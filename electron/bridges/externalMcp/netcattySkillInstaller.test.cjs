"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  NETCATTY_SKILL_MANAGED_MARKER,
  getBundledSensorSkillPath,
  getUserSensorSkillPath,
  resolveGrokHomeDir,
  getSensorSkillStatus,
  installSensorSkill,
} = require("./netcattySkillInstaller.cjs");

async function withTempHome(run) {
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "netcatty-client-skill-"));
  try {
    await run(homeDir);
  } finally {
    await fs.rm(homeDir, { recursive: true, force: true });
  }
}

for (const client of ["codex", "claude", "grok"]) {
  test(`installs the bundled Sensor skill for ${client}`, async () => {
    await withTempHome(async (homeDir) => {
      const options = { client, homeDir };
      const result = await installSensorSkill(options);
      const expected = await fs.readFile(getBundledSensorSkillPath(), "utf8");
      const installed = await fs.readFile(getUserSensorSkillPath(client, options), "utf8");

      assert.equal(result.installed, true);
      assert.equal(result.changed, true);
      assert.equal(installed, expected);
      assert.equal((await getSensorSkillStatus(options)).installed, true);

      const repeated = await installSensorSkill(options);
      assert.equal(repeated.changed, false);
    });
  });
}

test("respects GROK_HOME when resolving the Grok skill directory", () => {
  const homeDir = path.join(path.sep, "home", "user");
  assert.equal(
    resolveGrokHomeDir({ HOME: homeDir, GROK_HOME: "custom-grok" }),
    path.join(homeDir, "custom-grok"),
  );
});

test("updates an older Sensor-managed skill", async () => {
  await withTempHome(async (homeDir) => {
    const options = { client: "claude", homeDir };
    const skillPath = getUserSensorSkillPath("claude", options);
    await fs.mkdir(path.dirname(skillPath), { recursive: true });
    await fs.writeFile(skillPath, `---\nmetadata:\n  ${NETCATTY_SKILL_MANAGED_MARKER}\n---\nold\n`);

    const result = await installSensorSkill(options);
    assert.equal(result.changed, true);
    assert.match(await fs.readFile(skillPath, "utf8"), /name: netcatty-mcp/);
  });
});

test("refuses to overwrite an unmanaged skill with the same name", async () => {
  await withTempHome(async (homeDir) => {
    const options = { client: "grok", homeDir };
    const skillPath = getUserSensorSkillPath("grok", options);
    const customContent = "---\nname: netcatty-mcp\ndescription: custom\n---\ncustom\n";
    await fs.mkdir(path.dirname(skillPath), { recursive: true });
    await fs.writeFile(skillPath, customContent);

    await assert.rejects(
      installSensorSkill(options),
      /unmanaged skill already exists/i,
    );
    assert.equal(await fs.readFile(skillPath, "utf8"), customContent);
  });
});
