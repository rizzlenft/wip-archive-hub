# Clawpatch on this repo

**You do not need to run clawpatch locally.** For bug fixes, merge normal PRs from the cloud agent or your editor. Clawpatch here is a **review tool** that finds issues; fixes land via PRs you approve.

This repo is messier than rizzle.io (Lovable legacy, duplicated `api/` + `backend/`, loose TypeScript). Fully hands-off auto-fix is unreliable with the experimental Cursor provider. We use **safeguards + PR-based fixes** instead.

---

## Recommended path (hands-off)

### 1. Bug fixes → normal PRs

Ask the cloud agent to fix bugs. Review and merge PRs like any other change. No clawpatch required.

### 2. Optional audit → GitHub Actions

**Actions → Clawpatch Review → Run workflow** (defaults: review only, no code changes)

Download the `clawpatch-report` artifact. Use it as a backlog, not something you act on immediately.

### 3. Optional local review (no fixes)

```bash
npm run clawpatch:review
```

Writes `clawpatch-report.md`. Does not edit any files.

---

## Local auto-fix (advanced only)

Only if you have **Codex CLI** installed (`codex --version`). Codex is clawpatch's stable default provider.

```bash
npm run clawpatch:run
```

What the script does:

1. Reviews up to 20 features
2. Attempts up to 10 fixes (one finding at a time)
3. **Auto-reverts** fixes that touch forbidden files (`.clawpatch/`, `package.json`, CI configs, etc.)
4. Auto-commits each good fix on your current branch
5. Writes `clawpatch-report-final.md`

Push your branch and open a PR when done.

| Variable | Default | Purpose |
|---|---|---|
| `CLAWPATCH_PROVIDER` | codex (if available) | Override with `cursor` / `claude` |
| `CLAWPATCH_FIX_LIMIT` | `10` | Set `0` for review-only |
| `CLAWPATCH_REVIEW_LIMIT` | `20` | Features to review |

---

## What clawpatch will flag (defer most of these)

| Category | Action |
|---|---|
| UI polish (404 logging, progress clamp) | Safe — fix via PR |
| Null checks / guards | Usually safe |
| Auth / cookies / CORS | Careful — test login/logout |
| Merge `api/` + `backend/` | **Defer** — dedicated architecture PR |
| TypeScript strict mode | **Defer** — large project |
| YouTube scraper rewrite | **Defer** — high risk |

See [ARCHITECTURE.md](ARCHITECTURE.md) for what production actually uses.

---

## Manual commands

```bash
npx clawpatch doctor --provider codex
npx clawpatch map
npx clawpatch review --limit 10
npx clawpatch report
```

Do **not** run `clawpatch fix` by hand unless you know what you're doing. Use `npm run clawpatch:run` so safeguards apply.

---

## Validation

Configured in `.clawpatch/config.json`: `lint`, `test`, `build`. Fixes require high confidence before auto-apply.
