# granola-cli

JSON-first CLI for the official Granola Public API.

## Install

Before npm publication:

```bash
npm install -g git+https://github.com/toolittlecakes/granola-cli.git
```

After npm publication:

```bash
npm install -g @toolittlecakes/granola-cli@latest
```

## Auth

Create a Granola API key in the desktop app: Settings -> Connectors -> API keys. Then set:

```bash
export GRANOLA_API_KEY=...
```

The CLI also loads `GRANOLA_API_KEY` from `~/.env` if it is not already in the environment. It never prints the key.

## Commands

```bash
granola-cli status
granola-cli folders list --all --json
granola-cli folders resolve itquick --json
granola-cli notes list --folder itquick --all --jsonl
granola-cli notes get not_... --include transcript --json
granola-cli notes summary not_... --format markdown
granola-cli notes transcript not_... --format markdown
granola-cli export folder itquick --out calls/granola_itquick --include summary,transcript --skip-existing
```

## Agent Skill

The version-matched guide is bundled into the CLI:

```bash
granola-cli skill
```

Install the thin discovery skill:

```bash
granola-cli setup --agents codex,claude
```

## Update Gate

When distributed through npm, `granola-cli` checks `@toolittlecakes/granola-cli@latest` before running commands. If a newer version exists, it exits and asks you to update.

For one local/dev command:

```bash
granola-cli --skip-updates status
```

Before npm publication, GitHub installs should use `--skip-updates` because the npm registry entry may not exist yet.

## API Surface

This tool uses only documented Granola Public API endpoints:

- `GET /v1/folders`
- `GET /v1/notes`
- `GET /v1/notes/{note_id}`

Base URL: `https://public-api.granola.ai/v1`.
