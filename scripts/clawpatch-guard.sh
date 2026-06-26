#!/usr/bin/env bash
# Reject clawpatch fixes that touch infrastructure or config files.
# Exit 0 = safe, 1 = forbidden paths changed (caller should git restore).
set -euo pipefail

if git diff --quiet && git diff --cached --quiet; then
  echo "guard: no changes"
  exit 0
fi

FORBIDDEN=(
  '.clawpatch/'
  'package.json'
  'package-lock.json'
  '.github/workflows/'
  'vercel.json'
  'vite.config.ts'
  'vite.config.js'
  'tsconfig.json'
  'tailwind.config'
  'eslint.config'
)

CHANGED=$(git diff --name-only; git diff --cached --name-only)
BLOCKED=()

while IFS= read -r file; do
  [ -z "$file" ] && continue
  for pattern in "${FORBIDDEN[@]}"; do
    if [[ "$file" == *"$pattern"* ]] || [[ "$file" == "$pattern" ]]; then
      BLOCKED+=("$file")
      break
    fi
  done
done <<< "$CHANGED"

if [ "${#BLOCKED[@]}" -gt 0 ]; then
  echo "guard: BLOCKED — fix touched forbidden files:"
  printf '  - %s\n' "${BLOCKED[@]}"
  echo "guard: reverting all changes from this fix attempt"
  exit 1
fi

echo "guard: ok — only safe paths changed"
git diff --stat
exit 0
