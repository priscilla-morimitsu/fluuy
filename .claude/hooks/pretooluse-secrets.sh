#!/usr/bin/env bash
#
# devrails :: Claude Code PreToolUse adapter
# Extracts the target file from the hook payload (delivered as JSON on stdin)
# and runs the SHARED block-secrets guardrail in .devrails/guardrails/.
# Exit 2 tells Claude Code to BLOCK the write; the guardrail's stderr is shown
# to the model so it can correct itself.
#
# This keeps a single secret-scanning implementation: the same script is used
# by `devrails check` (git hook / CI) and here (Claude Code native hook).

set -uo pipefail

input="$(cat)"
proj="${CLAUDE_PROJECT_DIR:-$PWD}"

# Extract tool_input.file_path. Prefer node (Claude Code requires it); fall back
# to jq if present.
fp="$(DR_IN="$input" node -e 'try{const j=JSON.parse(process.env.DR_IN);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}' 2>/dev/null)"
if [ -z "$fp" ] && command -v jq >/dev/null 2>&1; then
  fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
fi

[ -z "$fp" ] && exit 0

"$proj/.devrails/guardrails/block-secrets.sh" "$fp" || exit 2
exit 0
