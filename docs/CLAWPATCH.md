# Clawpatch setup

[Clawpatch](https://github.com/openclaw/clawpatch) maps this repo into semantic feature slices, reviews each with an AI provider, and records findings for systematic fixes.

## Install

```bash
npm install -g clawpatch
# or: pnpm add -g clawpatch
```

You also need a provider CLI. The default is Codex:

```bash
codex --version
clawpatch doctor
```

Cursor Agent CLI is also supported (experimental). See the [clawpatch README](https://github.com/openclaw/clawpatch/blob/main/README.md) for Claude Code and other providers.

## Workflow

```bash
# One-time setup (creates .clawpatch/ state directory)
clawpatch init

# Map the repo into reviewable features
clawpatch map

# Review features and generate findings
clawpatch review --limit 5

# View report
clawpatch report

# Inspect a specific finding
clawpatch show --finding <id>

# Fix one finding at a time (requires clean git worktree)
clawpatch fix --finding <id>
```

## Validation commands

Clawpatch uses the project's npm scripts for validation after fixes:

| Script | Command |
|---|---|
| lint | `npm run lint` |
| test | `npm test` |
| build | `npm run build` |

These are configured in `.clawpatch/config.json`.

## What to expect for this repo

Clawpatch will likely surface issues in:

- Duplicated API handlers between `backend/` and `api/`
- Auth/logout/cookie handling across deployments
- YouTube scraper fragility
- TypeScript strictness gaps
- Unprotected or inconsistently guarded routes

Review findings before applying fixes. Clawpatch does not auto-commit or auto-deploy.

## CI integration (optional)

To run clawpatch in GitHub Actions you need a provider available in CI (e.g. Codex CLI with credentials). For local development, run `clawpatch review` before opening PRs.

```bash
clawpatch ci --since origin/main --output clawpatch-report.md
```
