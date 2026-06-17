#!/usr/bin/env bash
#
# fluuy :: Claude Code PostToolUse adapter
# After Claude writes/edits a TS/TSX file, run the project's custom
# check-tenant-isolation guardrail and surface violations (exit 2) so
# Claude fixes them immediately. Mirrors devrails' posttooluse-quality.sh.

set -uo pipefail

input="$(cat)"
proj="${CLAUDE_PROJECT_DIR:-$PWD}"
fp="$(DR_IN="$input" node -e 'try{const j=JSON.parse(process.env.DR_IN);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}' 2>/dev/null)"

[ -z "$fp" ] && exit 0
case "$fp" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

guardrail="$proj/.devrails/guardrails/check-tenant-isolation.sh"
[ -x "$guardrail" ] || exit 0

if ! out="$("$guardrail" "$fp" 2>&1)"; then
  echo "fluuy tenant-isolation check failed after editing ${fp}:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
