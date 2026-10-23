import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseInclude } from "../src/index.js";
import { getEnvApiKey } from "../src/auth.js";
import { isNewerVersion } from "../src/update-gate.js";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "granola-cli-test-"));

function run(args, extraEnv = {}) {
  const { GRANOLA_API_KEY: _inherited, ...baseEnv } = process.env;
  return spawnSync(process.execPath, ["bin/granola-cli", "--skip-updates", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...baseEnv, GRANOLA_CLI_HOME: tmpHome, ...extraEnv }
  });
}

assert.equal(isNewerVersion("0.1.1", "0.1.0"), true);assert.equal(isNewerVersion("0.1.0", "0.1.0"), false);
assert.equal(isNewerVersion("0.0.9", "0.1.0"), false);
assert.equal(getEnvApiKey(), null);
process.env.GRANOLA_API_KEY = "  env-token  ";
assert.equal(getEnvApiKey(), "env-token");
process.env.GRANOLA_API_KEY = "   ";
assert.equal(getEnvApiKey(), null);
delete process.env.GRANOLA_API_KEY;

assert.deepEqual(
  parseInclude(["--include", "summary,transcript"], { allowed: ["summary", "transcript"] }),
  ["summary", "transcript"]
);

const help = run(["help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /Official Granola Public API CLI/);
assert.match(help.stdout, /sync \[<folder-name-or-id>\] --out <dir>/);

const notesHelp = run(["notes", "get", "--help"]);
assert.equal(notesHelp.status, 0, notesHelp.stderr);
assert.match(notesHelp.stdout, /Use "notes transcript" when you only need the full transcript/);

const invalidInclude = run(["notes", "get", "not_1234567890abcd", "--include", "summary,banana", "--json"]);
assert.notEqual(invalidInclude.status, 0);
assert.match(invalidInclude.stdout, /Unsupported --include value: banana/);

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

const auth = run(["auth", "test-token", "--json"]);
assert.equal(auth.status, 0, auth.stderr);
assert.equal(JSON.parse(auth.stdout).configured, true);
const authConfig = JSON.parse(fs.readFileSync(path.join(tmpHome, "config.json"), "utf8"));
assert.equal(authConfig.apiKey, "test-token");

const statusAfterAuth = run(["status", "--json"]);
assert.equal(statusAfterAuth.status, 0, statusAfterAuth.stderr);
const parsedAfterAuth = JSON.parse(statusAfterAuth.stdout);
assert.equal(parsedAfterAuth.auth.configured, true);
assert.equal(parsedAfterAuth.auth.source, "config");

const envStatus = run(["auth", "status", "--json"], { GRANOLA_API_KEY: "env-token" });
assert.equal(envStatus.status, 0, envStatus.stderr);
const parsedEnvStatus = JSON.parse(envStatus.stdout);
assert.equal(parsedEnvStatus.auth.configured, true);
assert.equal(parsedEnvStatus.auth.source, "env");

const envStatusText = run(["auth", "status"], { GRANOLA_API_KEY: "env-token" });
assert.equal(envStatusText.status, 0, envStatusText.stderr);
assert.match(envStatusText.stdout, /auth: configured via env/);

const envClear = run(["auth", "clear"], { GRANOLA_API_KEY: "env-token" });
assert.equal(envClear.status, 0, envClear.stderr);
assert.match(envClear.stdout, /GRANOLA_API_KEY is set and still takes precedence/);
assert.equal(JSON.parse(fs.readFileSync(path.join(tmpHome, "config.json"), "utf8")).apiKey, undefined);

const envOnly = run(["status", "--json"], { GRANOLA_API_KEY: "env-token" });
assert.equal(envOnly.status, 0, envOnly.stderr);
assert.equal(JSON.parse(envOnly.stdout).auth.source, "env");

console.log("smoke ok");
