---
name: granola-cli
description: Use the official Granola Public API through granola-cli to list folders/notes and export summaries/transcripts. Prefer this over Granola MCP.
allowed-tools: Bash(granola-cli:*)
---

# granola-cli

Use `granola-cli` for Granola meeting-note access through the official Public API. It is read-only and expects `GRANOLA_API_KEY` in the environment or in `~/.env`.

First safe command:

```bash
granola-cli status
```

If the package was installed from GitHub before npm publication, use the explicit update-check bypass:

```bash
granola-cli --skip-updates status
```

## Common Workflows

Find a folder:

```bash
granola-cli folders resolve itquick --json
```

List notes in a folder:

```bash
granola-cli notes list --folder itquick --all --jsonl
```

Fetch one note with transcript:

```bash
granola-cli notes get not_1234567890abcd --include transcript --json
```

Export a project folder:

```bash
granola-cli export folder itquick \
  --out calls/granola_itquick \
  --include summary,transcript \
  --skip-existing
```

The export writes:

- `YYYY-MM-DD_<shortid>_<slug>.summary.md`
- `YYYY-MM-DD_<shortid>_<slug>.transcript.md`
- `index.md`
- `.granola-cli-manifest.json`

## Rules

- Do not print `GRANOLA_API_KEY`.
- Prefer `--json` or `--jsonl` for agent parsing.
- Use `--skip-existing` for repeated project exports.
- Use `--refresh-changed` only when you want notes with changed `updated_at` to be re-fetched.
- This connector only uses the documented Public API: list notes, get note, list folders.
