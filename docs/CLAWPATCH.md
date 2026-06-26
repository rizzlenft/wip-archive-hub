# Clawpatch setup

[Clawpatch](https://github.com/openclaw/clawpatch) maps this repo into semantic feature slices, reviews each with a provider, and fixes findings one at a time with validation.

## Guided one-by-one review (recommended)

Use this when you want clawpatch to propose fixes but **you** decide what lands. This is the safest approach for this repo.

### One-time setup

```bash
cd ~/wip-archive-hub
git checkout main
git pull origin main
git checkout -b clawpatch/fixes-round-1

npx clawpatch doctor --provider cursor
npx clawpatch map
npx clawpatch review --provider cursor --jobs 3 --limit 20
npx clawpatch report -o clawpatch-report.md
```

Read the report first so you know the landscape:

```bash
less clawpatch-report.md
```

### Fix loop (repeat until no findings)

```bash
npm run clawpatch:fix-one
```

Each run:

1. Shows the next finding and what clawpatch thinks is wrong
2. Applies one fix
3. Runs build + test + lint
4. Prints `git diff` for you to review

Then choose:

| Your call | Commands |
|---|---|
| **Accept** — diff matches the finding, only expected files changed | `git add -p` → `git commit -m "fix: …"` → `npx clawpatch revalidate --finding <id>` |
| **Reject** — wrong file, bad change, or nonsense | `git restore .` → `npx clawpatch triage --finding <id> --status false-positive --note "why"` |
| **Defer** — valid issue but too big / risky for now | `git restore .` → `npx clawpatch triage --finding <id> --status wont-fix --note "defer: why"` |

**Important:** clawpatch requires a **clean worktree** before each fix. Commit or revert before running `fix-one` again.

When the loop is empty, push and open a PR:

```bash
git push -u origin clawpatch/fixes-round-1
```

---

## How to judge a fix (this repo)

You do not need to be a senior engineer. Use this checklist on every `git diff`.

### 1. Does the diff match the finding?

- Finding says `NotFound.tsx` → diff should touch `src/pages/NotFound.tsx` (or a test for it)
- If the finding mentions file A but the diff edits file B → **reject** (this is what happened with `.clawpatch/config.json`)

### 2. How many files changed?

| Files touched | Usually |
|---|---|
| 1 file, small change | Safe to accept if it matches the finding |
| 2–3 related files (component + test) | Good |
| 5+ files or renames | **Defer** unless you understand the full blast radius |
| `.clawpatch/config.json`, `package.json`, CI workflows | **Reject** unless the finding is explicitly about that file |

### 3. Fix category cheat sheet

| Category | Example | Accept? | Notes |
|---|---|---|---|
| **UI polish** | Progress bar clamping, remove 404 `console.error` | Usually yes | Low risk; does not affect production API |
| **Missing null check** | YouTube scraper handles empty response | Usually yes | Defensive; keeps site from crashing |
| **Auth / cookies / CORS** | JWT cookie domain, logout redirect | **Careful** | Test login + logout on staging after merge |
| **Route protection** | `/admin/newsletter` guard | Usually yes | Aligns with [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Delete dead code** | `*.disabled.ts`, unused imports | Usually yes | Read the file name — `.disabled` is intentional dead code |
| **Consolidate `api/` vs `backend/`** | Merge duplicate handlers | **Defer** | Large architectural change; pick one layer in a dedicated PR |
| **Enable TypeScript strict** | `strict: true` across repo | **Defer** | Can touch hundreds of files; do as its own project |
| **Rewrite YouTube scraper** | New parsing strategy | **Defer** | High breakage risk; accept only tiny guards |
| **Change env vars / secrets** | New `VITE_*` or cookie names | **Defer** | Requires Cloudflare + Vercel dashboard updates |
| **Dependency upgrades** | Bump major versions | **Careful** | Check changelog; run build + test |

### 4. Quick smoke test after accept

```bash
npm run build
npm test
npm run dev   # click: home, /events, /newsletter, login, logout, a fake /nope 404
```

Production is split: **Cloudflare Pages** (SPA) + **Vercel** (`api.thewipmeetup.com`). Frontend-only fixes are low risk. Changes under `api/` or `backend/` can affect live auth and newsletter.

### 5. When in doubt

- **Reject** and ask (paste finding + `git diff` in chat)
- Or **defer** with a note — clawpatch will skip it on future runs

---

## Autonomous run (hands-off, review diff at end)

Same workflow as [rizzle.io](https://github.com/rizzlenft/rizzle), but fixes can edit the wrong file — prefer guided mode above.

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
