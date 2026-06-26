#!/usr/bin/env bash
# Clawpatch review + guarded fix loop. Codex-first; auto-reverts bad fixes.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${CLAWPATCH_LOG:-/tmp/clawpatch-wip-run.log}"
FIX_LIMIT="${CLAWPATCH_FIX_LIMIT:-10}"
REVIEW_LIMIT="${CLAWPATCH_REVIEW_LIMIT:-20}"
GUARD="$PROJECT/scripts/clawpatch-guard.sh"

exec > >(tee -a "$LOG") 2>&1

resolve_clawpatch() {
  if command -v clawpatch >/dev/null 2>&1; then
    echo "clawpatch"
    return
  fi
  if npx --yes clawpatch --version >/dev/null 2>&1; then
    echo "npx --yes clawpatch"
    return
  fi
  echo "error: clawpatch not found. Run: npm install -g clawpatch" >&2
  exit 1
}

resolve_provider() {
  if [ -n "${CLAWPATCH_PROVIDER:-}" ]; then
    echo "$CLAWPATCH_PROVIDER"
    return
  fi
  if command -v codex >/dev/null 2>&1 && clawpatch doctor --provider codex >/dev/null 2>&1; then
    echo "codex"
    return
  fi
  if command -v cursor-agent >/dev/null 2>&1; then
    echo "cursor"
    return
  fi
  echo "codex"
}

CLAW=$(resolve_clawpatch)
PROVIDER=$(resolve_provider)

echo "=== clawpatch run started $(date) ==="
echo "Project: $PROJECT"
echo "Provider: $PROVIDER (codex preferred; set CLAWPATCH_PROVIDER to override)"
echo "Fix limit: $FIX_LIMIT"
echo "Using: $CLAW"

cd "$PROJECT"
echo "Git status before:"
git status -sb

export CLAWPATCH_CURSOR_EXPERIMENTAL="${CLAWPATCH_CURSOR_EXPERIMENTAL:-1}"
export CLAWPATCH_CURSOR_ALLOW_WRITE="${CLAWPATCH_CURSOR_ALLOW_WRITE:-1}"

$CLAW doctor --provider "$PROVIDER" || $CLAW doctor || true

$CLAW init 2>/dev/null || true
$CLAW map
$CLAW status

echo "=== Review ==="
$CLAW review --provider "$PROVIDER" --jobs 3 --limit "$REVIEW_LIMIT" \
  || $CLAW review --provider codex --jobs 3 --limit "$REVIEW_LIMIT" \
  || true
$CLAW report -o clawpatch-report.md

if [ "$FIX_LIMIT" = "0" ]; then
  echo "=== Review only (FIX_LIMIT=0). No fixes applied. ==="
  echo "Report: clawpatch-report.md"
  exit 0
fi

FIXES=0
SKIPPED=0
while [ "$FIXES" -lt "$FIX_LIMIT" ]; do
  NEXT_OUT=$($CLAW next 2>/dev/null || true)
  ID=$(echo "$NEXT_OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)
  if [ -z "$ID" ]; then
    echo "No more findings."
    break
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Worktree dirty before fix $ID — commit or restore first."
    break
  fi

  echo "=== Fixing finding $ID ($((FIXES + 1))/$FIX_LIMIT) ==="
  $CLAW show --finding "$ID" || break

  if ! $CLAW fix --finding "$ID" --provider "$PROVIDER" \
    && ! $CLAW fix --finding "$ID" --provider codex; then
    echo "Fix failed for $ID"
    break
  fi

  if ! bash "$GUARD"; then
    git restore .
    $CLAW triage --finding "$ID" --status false-positive --note "auto-reverted: touched forbidden files" || true
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  npm run build
  npm test
  npm run lint || true
  $CLAW revalidate --finding "$ID" || true

  git add -A
  git commit -m "fix(clawpatch): finding ${ID}" || true
  FIXES=$((FIXES + 1))
done

echo "=== Done. Fixes applied: $FIXES, auto-reverted: $SKIPPED ==="
$CLAW report -o clawpatch-report-final.md
echo "Log: $LOG"
