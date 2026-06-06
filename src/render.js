export function slugify(input, fallback = "untitled") {
  const slug = String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || fallback;
}

export function shortId(id) {
  return String(id || "").replace(/^not_/, "").slice(0, 8) || "unknown";
}

export function noteDate(note) {
  const raw = note.created_at || note.calendar_event?.scheduled_start_time || note.updated_at;
  if (!raw) return "unknown-date";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function noteBaseName(note) {
  return `${noteDate(note)}_${shortId(note.id)}_${slugify(note.title)}`;
}

export function renderSummaryMarkdown(note) {
  const lines = [
    "---",
    `granola_id: ${JSON.stringify(note.id)}`,
    `created_at: ${JSON.stringify(note.created_at || null)}`,
    `updated_at: ${JSON.stringify(note.updated_at || null)}`,
    `web_url: ${JSON.stringify(note.web_url || null)}`,
    'artifact: "summary"',
    'source: "granola_public_api"',
    "---",
    "",
    `# ${note.title || "Untitled"}`,
    ""
  ];
  const summary = note.summary_markdown || note.summary_text || "";
  lines.push(summary.trim() || "_No summary returned by Granola API._", "");
  return lines.join("\n");
}

function speakerLabel(item) {
  const speaker = item.speaker || {};
  return speaker.name || speaker.email || speaker.diarization_label || speaker.source || "speaker";
}

export function renderTranscriptMarkdown(note) {
  const transcript = Array.isArray(note.transcript) ? note.transcript : [];
  const lines = [
    "---",
    `granola_id: ${JSON.stringify(note.id)}`,
    `created_at: ${JSON.stringify(note.created_at || null)}`,
    `updated_at: ${JSON.stringify(note.updated_at || null)}`,
    `web_url: ${JSON.stringify(note.web_url || null)}`,
    'artifact: "transcript"',
    'source: "granola_public_api"',
    "---",
    "",
    `# ${note.title || "Untitled"} - Transcript`,
    ""
  ];
  if (transcript.length === 0) {
    lines.push("_No transcript returned by Granola API._", "");
    return lines.join("\n");
  }
  for (const item of transcript) {
    const time = item.start_time ? `[${item.start_time}] ` : "";
    lines.push(`${time}${speakerLabel(item)}: ${item.text || ""}`.trimEnd(), "");
  }
  return lines.join("\n");
}

export function renderIndexMarkdown({ folder, exportedAt, items }) {
  const lines = [
    "# Granola Export",
    "",
    `- Source folder: ${folder ? `${folder.name} (${folder.id})` : "all accessible notes"}`,
    `- Documents: ${items.length}`,
    `- Exported at: ${exportedAt}`,
    "",
    "| Date | Title | Granola ID | Transcript | Summary |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const item of items) {
    lines.push(
      `| ${noteDate(item.note)} | ${item.note.title || "Untitled"} | \`${item.note.id}\` | [transcript](./${item.transcriptFile}) | [summary](./${item.summaryFile}) |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function printJson(value, jsonl = false) {
  if (jsonl && Array.isArray(value)) {
    for (const row of value) process.stdout.write(`${JSON.stringify(row)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
