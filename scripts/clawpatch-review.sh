#!/usr/bin/env bash
# Review only — no code changes. Safe to run anytime.
set -euo pipefail
export CLAWPATCH_FIX_LIMIT=0
exec "$(dirname "$0")/run-clawpatch.sh"
