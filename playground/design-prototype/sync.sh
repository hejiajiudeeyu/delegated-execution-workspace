#!/usr/bin/env bash
# sync.sh — refresh the vendored design prototype from call-anything-brand-site.
#
# Usage:
#   ./playground/design-prototype/sync.sh
#   BRAND_SITE=/custom/path ./playground/design-prototype/sync.sh
#
# After running, follow up with:
#   1. git diff playground/design-prototype/  — inspect what changed
#   2. update SOURCE.md → "Pinned commit" + "Vendored on"
#   3. commit with: chore(playground): sync design prototype to brand-site <short-SHA>

set -euo pipefail

BRAND_SITE="${BRAND_SITE:-$HOME/Documents/Projects/call-anything-brand-site}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -d "$BRAND_SITE" ]]; then
  echo "[sync] error: brand-site not found at $BRAND_SITE" >&2
  echo "[sync] set BRAND_SITE=/path/to/call-anything-brand-site to override" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "[sync] error: rsync not installed" >&2
  exit 1
fi

CURRENT_SHA="$(git -C "$BRAND_SITE" rev-parse --short HEAD 2>/dev/null || echo "<unknown>")"
echo "[sync] source: $BRAND_SITE @ $CURRENT_SHA"
echo "[sync] target: $SCRIPT_DIR"

WORKING_DIRTY="$(git -C "$BRAND_SITE" status --short 2>/dev/null || true)"
if [[ -n "$WORKING_DIRTY" ]]; then
  echo "[sync] warn: brand-site working tree is dirty — vendored snapshot will not match $CURRENT_SHA exactly:"
  echo "$WORKING_DIRTY" | sed 's/^/[sync]   /'
  echo
fi

declare -a COPIES=(
  "src/design-system/shells/console-shell.tsx     shells/console-shell.tsx"
  "src/design-system/patterns/console-page-dashboard.tsx     patterns/console-page-dashboard.tsx"
  "src/design-system/patterns/console-page-catalog.tsx       patterns/console-page-catalog.tsx"
  "src/design-system/patterns/console-page-calls.tsx         patterns/console-page-calls.tsx"
  "src/design-system/patterns/console-page-approvals.tsx     patterns/console-page-approvals.tsx"
  "src/design-system/patterns/console-page-help.tsx          patterns/console-page-help.tsx"
  "src/design-system/patterns/console-page-access-lists.tsx  patterns/console-page-access-lists.tsx"
  "src/styles/console-mode.css                               styles/console-mode.css"
  "src/styles/delexec-console-tokens.css                     styles/delexec-console-tokens.css"
  "docs/console-content-spec.md                              docs/console-content-spec.md"
  "docs/console-prototype-handoff.md                         docs/console-prototype-handoff.md"
)

for entry in "${COPIES[@]}"; do
  read -r SRC_REL DST_REL <<<"$entry"
  SRC_ABS="$BRAND_SITE/$SRC_REL"
  DST_ABS="$SCRIPT_DIR/$DST_REL"
  if [[ ! -f "$SRC_ABS" ]]; then
    echo "[sync] warn: missing in source — $SRC_REL"
    continue
  fi
  mkdir -p "$(dirname "$DST_ABS")"
  rsync -a "$SRC_ABS" "$DST_ABS"
  echo "[sync] copied $SRC_REL"
done

echo
echo "[sync] done. brand-site SHA: $CURRENT_SHA"
echo "[sync] next steps:"
echo "  1. git -C $(git -C "$SCRIPT_DIR" rev-parse --show-toplevel) diff playground/design-prototype/"
echo "  2. update playground/design-prototype/SOURCE.md → Pinned commit / Vendored on"
echo "  3. git commit -m 'chore(playground): sync design prototype to brand-site $CURRENT_SHA'"
