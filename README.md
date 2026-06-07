# granola-cli

JSON-first CLI for the official Granola Public API.

## Install

Use the published npm package:

```bash
npm install -g @toolittlecakes/granola-cli@latest
```

For local development from GitHub:

```bash
npm install -g git+https://github.com/toolittlecakes/granola-cli.git
```

## Auth

Create a Granola API key in the desktop app: Settings -> Connectors -> API keys. Then save it once:

```bash
granola-cli auth <token>
```

The token is stored in `~/.granola-cli/config.json` with file mode `0600` where supported. The CLI does not read `~/.env` and never prints the token.

Check auth state:

```bash
granola-cli auth status
```

Clear auth:

```bash
granola-cli auth clear
```

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

GitHub installs should use `--skip-updates` because the update gate compares against the published npm package.

## API Surface

This tool uses only documented Granola Public API endpoints:

- `GET /v1/folders`
- `GET /v1/notes`
- `GET /v1/notes/{note_id}`

Base URL: `https://public-api.granola.ai/v1`.
