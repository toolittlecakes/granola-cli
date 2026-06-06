import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliError } from "./errors.js";

const DEFAULT_ENV_FILE = path.join(os.homedir(), ".env");

function configuredEnvFile() {
  return process.env.GRANOLA_CLI_ENV_FILE || DEFAULT_ENV_FILE;
}

function parseDotenvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [match[1], value];
}

export function loadEnvFile(filePath = DEFAULT_ENV_FILE) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseDotenvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

export function getApiKey({ required = true, envFile = configuredEnvFile() } = {}) {
  if (!process.env.GRANOLA_API_KEY) loadEnvFile(envFile);
  const apiKey = process.env.GRANOLA_API_KEY;
  if (!apiKey && required) {
    throw new CliError(
      "AUTH_REQUIRED",
      "GRANOLA_API_KEY is not set",
      "Set GRANOLA_API_KEY in the environment or ~/.env"
    );
  }
  return apiKey || null;
}

export function hasConfiguredApiKey() {
  try {
    return Boolean(getApiKey({ required: false }));
  } catch {
    return false;
  }
}
