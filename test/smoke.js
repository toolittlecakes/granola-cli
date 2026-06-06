import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { isNewerVersion } from "../src/update-gate.js";

function run(args) {
  return spawnSync(process.execPath, ["bin/granola-cli", "--skip-updates", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, GRANOLA_API_KEY: "", GRANOLA_CLI_ENV_FILE: "/dev/null" }
  });
}

assert.equal(isNewerVersion("0.1.1", "0.1.0"), true);
assert.equal(isNewerVersion("0.1.0", "0.1.0"), false);
assert.equal(isNewerVersion("0.0.9", "0.1.0"), false);

const help = run(["help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /Official Granola Public API CLI/);

const skill = run(["skill"]);
assert.equal(skill.status, 0, skill.stderr);
assert.match(skill.stdout, /Use `granola-cli`/);

const status = run(["status", "--json"]);
assert.equal(status.status, 0, status.stderr);
const parsed = JSON.parse(status.stdout);
assert.equal(parsed.ok, true);
assert.equal(parsed.auth.configured, false);

const missingAuth = run(["folders", "list", "--json"]);
assert.notEqual(missingAuth.status, 0);
assert.match(missingAuth.stdout, /AUTH_REQUIRED/);

console.log("smoke ok");
