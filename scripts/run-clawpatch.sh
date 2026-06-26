#!/usr/bin/env bash
# Autonomous clawpatch review + fix loop (same pattern as rizzle.io).
# Requires a local provider CLI: cursor-agent (default), codex, or claude.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${CLAWPATCH_LOG:-/tmp/clawpatch-wip-run.log}"
FIX_LIMIT="${CLAWPATCH_FIX_LIMIT:-15}"
PROVIDER="${CLAWPATCH_PROVIDER:-cursor}"

exec > >(tee -a "$LOG") 2>&1

echo "=== clawpatch run started $(date) ==="
echo "Project: $PROJECT"
echo "Provider: $PROVIDER"
echo "Fix limit: $FIX_LIMIT"

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

CLAW=$(resolve_clawpatch)
echo "Using: $CLAW"

cd "$PROJECT"
echo "Git status before:"
git status -sb

# Cursor provider is experimental; write mode required for fix.
export CLAWPATCH_CURSOR_EXPERIMENTAL="${CLAWPATCH_CURSOR_EXPERIMENTAL:-1}"
export CLAWPATCH_CURSOR_ALLOW_WRITE="${CLAWPATCH_CURSOR_ALLOW_WRITE:-1}"

$CLAW doctor --provider "$PROVIDER" || $CLAW doctor || true

if ! $CLAW doctor --provider "$PROVIDER" 2>&1; then
  if [ "$PROVIDER" = "cursor" ]; then
    echo "Cursor provider unavailable; falling back to codex."
    PROVIDER="codex"
    $CLAW doctor --provider codex || true
  fi
fi

$CLAW init 2>/dev/null || true
$CLAW map
$CLAW status

echo "=== Review ==="
$CLAW review --provider "$PROVIDER" --jobs 3 --limit 20 \
  || $CLAW review --provider codex --jobs 3 --limit 20 \
  || true
$CLAW report -o clawpatch-report.md

FIXES=0
while [ "$FIXES" -lt "$FIX_LIMIT" ]; do
  NEXT_OUT=$($CLAW next 2>/dev/null || true)
  ID=$(echo "$NEXT_OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)
  if [ -z "$ID" ]; then
    echo "No more findings."
    break
  fi
  echo "=== Fixing finding $ID ($((FIXES + 1))/$FIX_LIMIT) ==="
  $CLAW show --finding "$ID" || break
  $CLAW fix --finding "$ID" --provider "$PROVIDER" \
    || $CLAW fix --finding "$ID" --provider codex \
    || break
  npm run build
  npm test
  npm run lint || true
  $CLAW revalidate --finding "$ID" || true
  FIXES=$((FIXES + 1))
done

echo "=== Done. Fixes applied: $FIXES ==="
$CLAW report -o clawpatch-report-final.md
git status -sb
git diff --stat || true

echo "Log: $LOG"
echo "Reports: clawpatch-report.md, clawpatch-report-final.md"
