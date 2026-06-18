import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clearApiKey, getApiKey, getAuthStatus, hasConfiguredApiKey, saveApiKey } from "./auth.js";
import { CliError, normalizeError } from "./errors.js";
import { exportFolder } from "./export.js";
import { GranolaApi } from "./granola-api.js";
import { printJson, renderSummaryMarkdown, renderTranscriptMarkdown } from "./render.js";
import { PACKAGE_NAME, VERSION, runUpdateGate } from "./update-gate.js";

const ROOT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function usage() {
  return `granola-cli ${VERSION}

Official Granola Public API CLI.

Usage:
  granola-cli [--skip-updates] help
  granola-cli [--skip-updates] skill
  granola-cli [--skip-updates] auth <token>
  granola-cli [--skip-updates] auth status [--json]
  granola-cli [--skip-updates] auth clear
  granola-cli [--skip-updates] setup --agents codex,claude
  granola-cli [--skip-updates] status [--check-api] [--json]
  granola-cli [--skip-updates] folders list [--all] [--json]
  granola-cli [--skip-updates] folders resolve <name-or-id> [--json]
  granola-cli [--skip-updates] notes list [--folder <name-or-id>] [--all] [--json|--jsonl]
  granola-cli [--skip-updates] notes get <note-id> [--include transcript] [--json]
  granola-cli [--skip-updates] notes summary <note-id> [--format markdown|json]
  granola-cli [--skip-updates] notes transcript <note-id> [--format markdown|json]
  granola-cli [--skip-updates] sync [<folder-name-or-id>] --out <dir> [--skip-existing] [--refresh-changed]
  granola-cli [--skip-updates] export folder <name-or-id> --out <dir> [--skip-existing] [--refresh-changed]

Auth:
  Run granola-cli auth <token> once. The token is stored in ~/.granola-cli/config.json.

Docs:
  https://docs.granola.ai/introduction
`;
}

function parseGlobalArgs(argv) {
  const globals = { skipUpdates: false, json: false, jsonl: false };
  const rest = [];
  for (const arg of argv) {
    if (arg === "--skip-updates") globals.skipUpdates = true;
    else if (arg === "--json") globals.json = true;
    else if (arg === "--jsonl") globals.jsonl = true;
    else rest.push(arg);
  }
  return { globals, rest };
}

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError("INVALID_ARGUMENT", `${name} requires a value`);
  }
  return value;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function makeApi() {
  const apiKey = getApiKey();
  return new GranolaApi({ apiKey });
}

function writeResult(result, { json = false, jsonl = false } = {}) {
  if (json || jsonl || typeof result !== "string") {
    printJson(result, jsonl);
    return;
  }
  process.stdout.write(`${result.endsWith("\n") ? result : `${result}\n`}`);
}

async function commandStatus(args, globals) {
  const result = {
    ok: true,
    package: PACKAGE_NAME,
    version: VERSION,
    auth: {
      configPath: getAuthStatus().configPath,
      configured: hasConfiguredApiKey()
    },
    apiBaseUrl: "https://public-api.granola.ai/v1"
  };
  if (hasFlag(args, "--check-api")) {
    const api = makeApi();
    await api.listNotes({ page_size: 1 });
    result.apiReachable = true;
  }
  if (globals.json) return result;
  return [
    `granola-cli ${VERSION}`,
    `auth: ${result.auth.configured ? "configured" : "not configured"}`,
    `api: ${hasFlag(args, "--check-api") ? "reachable" : "not checked"}`
  ].join("\n");
}

async function commandFolders(args, globals) {
  const sub = args[0];
  const api = makeApi();
  if (sub === "list") {
    const folders = hasFlag(args, "--all")
      ? await api.listAllFolders({ page_size: Number(readOption(args, "--page-size", 30)) })
      : await api.listFolders({ cursor: readOption(args, "--cursor"), page_size: Number(readOption(args, "--page-size", 10)) });
    return folders;
  }
  if (sub === "resolve") {
    const target = args[1];
    if (!target) throw new CliError("INVALID_ARGUMENT", "folders resolve requires a folder name or id");
    return await api.resolveFolder(target);
  }
  throw new CliError("UNKNOWN_COMMAND", `Unknown folders command: ${sub || ""}`);
}

async function commandNotes(args, globals) {
  const sub = args[0];
  const api = makeApi();
  if (sub === "list") {
    const folderTarget = readOption(args, "--folder");
    const folder = folderTarget ? await api.resolveFolder(folderTarget) : null;
    const params = {
      folder_id: folder?.id,
      cursor: readOption(args, "--cursor"),
      page_size: Number(readOption(args, "--page-size", hasFlag(args, "--all") ? 30 : 10)),
      created_after: readOption(args, "--created-after"),
      created_before: readOption(args, "--created-before"),
      updated_after: readOption(args, "--updated-after")
    };
    return hasFlag(args, "--all") ? await api.listAllNotes(params) : await api.listNotes(params);
  }
  if (sub === "get") {
    const noteId = args[1];
    if (!noteId) throw new CliError("INVALID_ARGUMENT", "notes get requires a note id");
    return await api.getNote(noteId, { includeTranscript: readOption(args, "--include") === "transcript" });
  }
  if (sub === "summary") {
    const noteId = args[1];
    if (!noteId) throw new CliError("INVALID_ARGUMENT", "notes summary requires a note id");
    const note = await api.getNote(noteId);
    const format = readOption(args, "--format", "markdown");
    return format === "json" ? note : renderSummaryMarkdown(note);
  }
  if (sub === "transcript") {
    const noteId = args[1];
    if (!noteId) throw new CliError("INVALID_ARGUMENT", "notes transcript requires a note id");
    const note = await api.getNote(noteId, { includeTranscript: true });
    const format = readOption(args, "--format", "markdown");
    return format === "json" ? note.transcript || [] : renderTranscriptMarkdown(note);
  }
  throw new CliError("UNKNOWN_COMMAND", `Unknown notes command: ${sub || ""}`);
}

async function commandExport(args) {
  const targetType = args[0];
  const target = args[1];
  if (targetType !== "folder") throw new CliError("UNKNOWN_COMMAND", "Only export folder is currently supported");
  if (!target) throw new CliError("INVALID_ARGUMENT", "export folder requires a folder name or id");
  const outDir = readOption(args, "--out");
  if (!outDir) throw new CliError("INVALID_ARGUMENT", "export folder requires --out <dir>");
  const include = (readOption(args, "--include", "summary,transcript") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const api = makeApi();
  const folder = await api.resolveFolder(target);
  return await exportFolder({
    api,
    folder,
    outDir,
    include,
    skipExisting: hasFlag(args, "--skip-existing") || !hasFlag(args, "--overwrite"),
    refreshChanged: hasFlag(args, "--refresh-changed"),
    index: !hasFlag(args, "--no-index"),
    filters: {
      created_after: readOption(args, "--created-after"),
      created_before: readOption(args, "--created-before"),
      updated_after: readOption(args, "--updated-after")
    }
  });
}

async function commandSync(args) {
  const explicitFolder = readOption(args, "--folder");
  const positionalTarget = args[0] && !args[0].startsWith("--") ? args[0] : null;
  const target = explicitFolder || positionalTarget;
  const outDir = readOption(args, "--out");
  if (!outDir) throw new CliError("INVALID_ARGUMENT", "sync requires --out <dir>");
  const include = (readOption(args, "--include", "summary,transcript") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const api = makeApi();
  const folder = target ? await api.resolveFolder(target) : null;
  return await exportFolder({
    api,
    folder,
    outDir,
    include,
    skipExisting: hasFlag(args, "--skip-existing") || !hasFlag(args, "--overwrite"),
    refreshChanged: hasFlag(args, "--refresh-changed"),
    index: !hasFlag(args, "--no-index"),
    filters: {
      created_after: readOption(args, "--created-after"),
      created_before: readOption(args, "--created-before"),
      updated_after: readOption(args, "--updated-after")
    }
  });
}

async function commandSkill() {
  return fs.readFileSync(path.join(ROOT_DIR, "skill-data", "core", "SKILL.md"), "utf8");
}

async function commandAuth(args, globals) {
  const sub = args[0];
  if (!sub || sub === "status") {
    const status = getAuthStatus();
    if (globals.json) return { ok: true, auth: status };
    return [
      `auth: ${status.configured ? "configured" : "not configured"}`,
      `config: ${status.configPath}`,
      `state: ${status.stateDir}`
    ].join("\n");
  }
  if (sub === "clear" || sub === "logout") {
    const configPath = clearApiKey();
    return globals.json ? { ok: true, configured: false, configPath } : `auth cleared: ${configPath}`;
  }
  if (sub.startsWith("--")) throw new CliError("INVALID_ARGUMENT", `Unknown auth option: ${sub}`);
  const configPath = saveApiKey(sub);
  return globals.json ? { ok: true, configured: true, configPath } : `auth saved: ${configPath}`;
}

async function commandSetup(args) {
  const agents = (readOption(args, "--agents", "") || "")
    .split(",")
    .map((agent) => agent.trim())
    .filter(Boolean);
  if (agents.length === 0) throw new CliError("INVALID_ARGUMENT", "setup requires --agents codex,claude,...");
  const home = process.env.HOME;
  if (!home) throw new CliError("INVALID_ENV", "HOME is not set");
  const source = fs.readFileSync(path.join(ROOT_DIR, "skills", "granola-cli", "SKILL.md"), "utf8");
  const dirs = {
    codex: path.join(home, ".codex", "skills", "granola-cli"),
    claude: path.join(home, ".claude", "skills", "granola-cli"),
    agents: path.join(home, ".agents", "skills", "granola-cli")
  };
  const installed = [];
  for (const agent of agents) {
    const dir = dirs[agent];
    if (!dir) throw new CliError("INVALID_ARGUMENT", `Unsupported agent "${agent}"`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), source, "utf8");
    installed.push({ agent, path: dir });
  }
  return { ok: true, installed };
}

export async function main(argv) {
  const { globals, rest } = parseGlobalArgs(argv);
  try {
    const command = rest[0] || "help";
    if (command === "--version" || command === "version") {
      if (!globals.skipUpdates) await runUpdateGate(globals);
      process.stdout.write(`${VERSION}\n`);
      return;
    }
    await runUpdateGate(globals);
    let result;
    if (command === "help" || command === "--help" || command === "-h") result = usage();
    else if (command === "skill") result = await commandSkill();
    else if (command === "auth") result = await commandAuth(rest.slice(1), globals);
    else if (command === "setup") result = await commandSetup(rest.slice(1));
    else if (command === "status") result = await commandStatus(rest.slice(1), globals);
    else if (command === "folders") result = await commandFolders(rest.slice(1), globals);
    else if (command === "notes") result = await commandNotes(rest.slice(1), globals);
    else if (command === "sync") result = await commandSync(rest.slice(1));
    else if (command === "export") result = await commandExport(rest.slice(1), globals);
    else throw new CliError("UNKNOWN_COMMAND", `Unknown command: ${command}`, "Run granola-cli help");
    writeResult(result, globals);
  } catch (error) {
    const normalized = normalizeError(error);
    if (globals.json || globals.jsonl) printJson(normalized.toJSON());
    else {
      process.stderr.write(`${normalized.code}: ${normalized.message}\n`);
      if (normalized.hint) process.stderr.write(`${normalized.hint}\n`);
    }
    process.exit(1);
  }
}
