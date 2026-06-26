# Clawpatch setup

[Clawpatch](https://github.com/openclaw/clawpatch) maps this repo into semantic feature slices, reviews each with a provider, and fixes findings one at a time with validation.

## Autonomous run (recommended)

Same workflow as [rizzle.io](https://github.com/rizzlenft/rizzle):

```bash
npm run clawpatch:run
```

This runs `scripts/run-clawpatch.sh` which:

1. Maps the repo into features
2. Reviews up to 20 features
3. Fixes up to 15 findings (one at a time)
4. Runs `npm run build`, `npm test`, `npm run lint` after each fix
5. Writes `clawpatch-report.md` and `clawpatch-report-final.md`

### Requirements

- **Cursor Agent CLI** (default provider):

  ```bash
  curl -fsSL https://cursor.com/install | bash
  cursor-agent --version
  ```

- Or set `CLAWPATCH_PROVIDER=codex` / `claude` if you use those CLIs instead.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `CLAWPATCH_PROVIDER` | `cursor` | Provider CLI to use |
| `CLAWPATCH_FIX_LIMIT` | `15` | Max findings to fix per run |
| `CLAWPATCH_CURSOR_EXPERIMENTAL` | `1` | Required for Cursor provider |
| `CLAWPATCH_CURSOR_ALLOW_WRITE` | `1` | Required for `fix` with Cursor |
| `CURSOR_API_KEY` | — | Headless auth (CI / scripts) |

### After the run

```bash
git status
git diff
```

Review changes, then commit on a branch and open a PR (branch protection requires this).

---

## GitHub Actions (optional)

**Actions → Clawpatch Stabilization → Run workflow**

| Input | Default | Notes |
|---|---|---|
| provider | `cursor` | Needs `CURSOR_API_KEY` repo secret for CI |
| fix_limit | `15` | Set `0` for review-only |
| open_pr | `true` | Opens a PR with fixes automatically |

Add secret: **Settings → Secrets → `CURSOR_API_KEY`**

---

## Manual commands

```bash
npx clawpatch doctor --provider cursor
npx clawpatch map
npx clawpatch review --limit 10
npx clawpatch report
npx clawpatch next
npx clawpatch show --finding <id>
npx clawpatch fix --finding <id>
```

---

## Validation

Configured in `.clawpatch/config.json`:

- `npm run lint`
- `npm test`
- `npm run build`

---

## What clawpatch will target in this repo

- Duplicated API handlers (`backend/` vs `api/`)
- Auth / cookie / CORS edge cases
- YouTube scraper fragility
- TypeScript and route protection gaps
- Dead or disabled code paths

Review the report before merging fix PRs.
