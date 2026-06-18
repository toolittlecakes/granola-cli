---
name: granola-cli
description: Read Granola meeting folders, notes, summaries, and transcripts through the official Granola Public API using the local `granola-cli` command. Use when Codex needs to find, search, inspect, export, or summarize Granola calls/meeting notes/transcripts, especially project folders such as ershov or itquick. Run `granola-cli skill` to read the complete up-to-date command guide before using the CLI.
---

## REQUIRED: Read Full Documentation First

Before using `granola-cli`, run:

```bash
granola-cli skill
```

Read the entire output. It contains the version-matched command guide, auth rules, export behavior, JSON/JSONL examples, and safety notes.

Do not duplicate or guess the full CLI contract from this discovery skill. Treat `granola-cli skill` as the source of truth.

## Minimal Example

After reading the full guide:

```bash
granola-cli status
granola-cli folders list --all --json
granola-cli notes list --folder ershov --all --jsonl
```

If the command is not found, install or update it:

```bash
npm install -g @toolittlecakes/granola-cli@latest
```

If auth is not configured, the user must create a Granola API key in the Granola desktop app and run `granola-cli auth <token>`. Never print or expose the saved token.
