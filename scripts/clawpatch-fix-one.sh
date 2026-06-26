#!/usr/bin/env bash
# Guided one-finding fix loop. Review git diff before accepting; revert if wrong.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
PROVIDER="${CLAWPATCH_PROVIDER:-cursor}"

resolve_clawpatch() {
  if command -v clawpatch >/dev/null 2>&1; then
    echo "clawpatch"
    return
  fi
  echo "npx --yes clawpatch"
}

CLAW=$(resolve_clawpatch)
cd "$PROJECT"

export CLAWPATCH_CURSOR_EXPERIMENTAL="${CLAWPATCH_CURSOR_EXPERIMENTAL:-1}"
export CLAWPATCH_CURSOR_ALLOW_WRITE="${CLAWPATCH_CURSOR_ALLOW_WRITE:-1}"

echo "=== Clawpatch: fix one finding ==="
echo "Project: $PROJECT"
echo "Provider: $PROVIDER"
echo ""

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Worktree is dirty. Commit, stash, or revert before fixing the next finding."
  echo "  git status"
  echo "  git restore .          # discard unreviewed changes"
  echo "  git stash push -m ...  # save for later"
  exit 1
fi

NEXT_OUT=$($CLAW next 2>/dev/null || true)
ID=$(echo "$NEXT_OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)

if [ -z "$ID" ]; then
  echo "No open findings. Run review first:"
  echo "  npx clawpatch review --provider $PROVIDER --jobs 3 --limit 20"
  echo "  npx clawpatch report -o clawpatch-report.md"
  exit 0
fi

echo "Next finding: $ID"
echo ""
$CLAW show --finding "$ID"
echo ""
echo "--- Applying fix (provider: $PROVIDER) ---"
$CLAW fix --finding "$ID" --provider "$PROVIDER" \
  || $CLAW fix --finding "$ID" --provider codex \
  || exit 1

echo ""
echo "=== Validate ==="
npm run build
npm test
npm run lint || true

echo ""
echo "=== Review the diff ==="
git diff --stat
echo ""
git diff

echo ""
echo "=== What to do next ==="
echo "ACCEPT (fix looks right, only expected files changed):"
echo "  git add -p"
echo "  git commit -m \"fix(clawpatch): <short description>\""
echo "  npx clawpatch revalidate --finding $ID"
echo ""
echo "REJECT (wrong file, unrelated change, or too risky):"
echo "  git restore ."
echo "  npx clawpatch triage --finding $ID --status false-positive --note \"reason\""
echo ""
echo "DEFER (valid but not now — large refactor, needs discussion):"
echo "  git restore ."
echo "  npx clawpatch triage --finding $ID --status wont-fix --note \"defer: reason\""
echo ""
echo "See docs/CLAWPATCH.md → Guided fix review for how to judge fixes."
