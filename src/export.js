import fs from "node:fs/promises";
import path from "node:path";
import { noteBaseName, renderIndexMarkdown, renderSummaryMarkdown, renderTranscriptMarkdown } from "./render.js";

async function readManifest(manifestPath) {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return { version: 1, notes: {} };
  }
}

async function writeFileIfNeeded(filePath, content, { overwrite }) {
  if (!overwrite) {
    try {
      await fs.access(filePath);
      return false;
    } catch {
      // file does not exist
    }
  }
  await fs.writeFile(filePath, content, "utf8");
  return true;
}

export async function exportFolder({ api, folder, outDir, include = ["summary", "transcript"], skipExisting = true, refreshChanged = false, index = true, filters = {} }) {
  await fs.mkdir(outDir, { recursive: true });
  const manifestPath = path.join(outDir, ".granola-cli-manifest.json");
  const manifest = await readManifest(manifestPath);
  const notes = await api.listAllNotes({
    folder_id: folder?.id,
    created_after: filters.created_after,
    created_before: filters.created_before,
    updated_after: filters.updated_after
  });
  const items = [];
  let fetched = 0;
  let skipped = 0;

  for (const listedNote of notes) {
    const previous = manifest.notes[listedNote.id];
    const unchanged = previous && previous.updated_at === listedNote.updated_at;
    if (skipExisting && unchanged && !refreshChanged) {
      skipped += 1;
      items.push({ note: listedNote, summaryFile: previous.summaryFile, transcriptFile: previous.transcriptFile });
      continue;
    }
    const note = await api.getNote(listedNote.id, { includeTranscript: include.includes("transcript") });
    fetched += 1;
    const baseName = noteBaseName(note);
    const summaryFile = `${baseName}.summary.md`;
    const transcriptFile = `${baseName}.transcript.md`;
    if (include.includes("summary")) {
      await writeFileIfNeeded(path.join(outDir, summaryFile), renderSummaryMarkdown(note), {
        overwrite: !skipExisting || refreshChanged
      });
    }
    if (include.includes("transcript")) {
      await writeFileIfNeeded(path.join(outDir, transcriptFile), renderTranscriptMarkdown(note), {
        overwrite: !skipExisting || refreshChanged
      });
    }
    manifest.notes[note.id] = {
      id: note.id,
      title: note.title || null,
      created_at: note.created_at || null,
      updated_at: note.updated_at || null,
      web_url: note.web_url || null,
      summaryFile,
      transcriptFile
    };
    items.push({ note, summaryFile, transcriptFile });
  }

  const exportedAt = new Date().toISOString();
  manifest.updated_at = exportedAt;
  manifest.folder = folder || null;
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (index) {
    await fs.writeFile(path.join(outDir, "index.md"), renderIndexMarkdown({ folder, exportedAt, items }), "utf8");
  }

  return { ok: true, outDir, total: notes.length, fetched, skipped, manifest: manifestPath };
}
