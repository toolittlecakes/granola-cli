import { CliError } from "./errors.js";

export const DEFAULT_BASE_URL = "https://public-api.granola.ai/v1";

function addQuery(url, params) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false) continue;
    url.searchParams.set(key, String(value));
  }
}

export class GranolaApi {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {}) {
    if (!apiKey) {
      throw new CliError(
        "AUTH_REQUIRED",
        "GRANOLA_API_KEY is not set",
        "Set GRANOLA_API_KEY in the environment or ~/.env"
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetch = fetchImpl;
  }

  async request(pathname, params = {}) {
    const url = new URL(`${this.baseUrl}${pathname}`);
    addQuery(url, params);
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "User-Agent": "granola-cli/0.1.0"
      }
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!response.ok) {
      throw new CliError(
        response.status === 401 || response.status === 403
          ? "AUTH_FAILED"
          : "GRANOLA_API_ERROR",
        `Granola API returned HTTP ${response.status}`,
        response.status === 401 || response.status === 403
          ? "Check GRANOLA_API_KEY and API key scopes"
          : null,
        body
      );
    }
    return body;
  }

  listNotes(params = {}) {
    return this.request("/notes", params);
  }

  getNote(noteId, { includeTranscript = false } = {}) {
    return this.request(`/notes/${encodeURIComponent(noteId)}`, {
      include: includeTranscript ? "transcript" : undefined
    });
  }

  listFolders(params = {}) {
    return this.request("/folders", params);
  }

  async listAllNotes(params = {}) {
    const notes = [];
    let cursor = params.cursor;
    do {
      const page = await this.listNotes({ ...params, cursor, page_size: params.page_size ?? 30 });
      notes.push(...(page.notes || []));
      cursor = page.hasMore ? page.cursor : null;
    } while (cursor);
    return notes;
  }

  async listAllFolders(params = {}) {
    const folders = [];
    let cursor = params.cursor;
    do {
      const page = await this.listFolders({ ...params, cursor, page_size: params.page_size ?? 30 });
      folders.push(...(page.folders || []));
      cursor = page.hasMore ? page.cursor : null;
    } while (cursor);
    return folders;
  }

  async resolveFolder(nameOrId) {
    if (/^fol_[A-Za-z0-9]{14}$/.test(nameOrId)) return { id: nameOrId, name: nameOrId };
    const folders = await this.listAllFolders();
    const normalized = nameOrId.trim().toLowerCase();
    const matches = folders.filter((folder) => (folder.name || "").trim().toLowerCase() === normalized);
    if (matches.length === 0) {
      throw new CliError("FOLDER_NOT_FOUND", `No folder named "${nameOrId}" was found`);
    }
    if (matches.length > 1) {
      throw new CliError(
        "FOLDER_AMBIGUOUS",
        `Multiple folders named "${nameOrId}" were found`,
        "Use a folder id instead",
        matches.map((folder) => ({ id: folder.id, name: folder.name, parent_folder_id: folder.parent_folder_id }))
      );
    }
    return matches[0];
  }
}
