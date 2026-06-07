import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliError } from "./errors.js";

export function getStateDir() {
  return process.env.GRANOLA_CLI_HOME || path.join(os.homedir(), ".granola-cli");
}

export function getConfigPath() {
  return path.join(getStateDir(), "config.json");
}

export function ensureStateDir() {
  const stateDir = getStateDir();
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(stateDir, 0o700);
  } catch {
    // Best effort: chmod may fail on non-POSIX filesystems.
  }
  return stateDir;
}

function readConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new CliError(
      "CONFIG_INVALID",
      `Could not parse ${configPath}`,
      `Fix or remove ${configPath}. Original error: ${error.message}`
    );
  }
}

function writeConfig(config) {
  ensureStateDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {
    // Best effort: chmod may fail on non-POSIX filesystems.
  }
  return configPath;
}

export function saveApiKey(apiKey) {
  const token = String(apiKey || "").trim();
  if (!token) throw new CliError("INVALID_ARGUMENT", "auth requires a non-empty token");
  const config = readConfig();
  config.apiKey = token;
  config.updatedAt = new Date().toISOString();
  return writeConfig(config);
}

export function clearApiKey() {
  const config = readConfig();
  delete config.apiKey;
  config.updatedAt = new Date().toISOString();
  return writeConfig(config);
}

export function getAuthStatus() {
  const configPath = getConfigPath();
  const config = readConfig();
  return {
    configured: Boolean(config.apiKey),
    configPath,
    stateDir: getStateDir(),
    updatedAt: config.updatedAt || null
  };
}

export function getApiKey({ required = true } = {}) {
  const config = readConfig();
  const apiKey = config.apiKey;
  if (!apiKey && required) {
    throw new CliError(
      "AUTH_REQUIRED",
      "Granola API token is not configured",
      "Run: granola-cli auth <token>"
    );
  }
  return apiKey || null;
}

export function hasConfiguredApiKey() {
  return Boolean(getApiKey({ required: false }));
}
