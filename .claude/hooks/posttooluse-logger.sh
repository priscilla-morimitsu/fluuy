#!/usr/bin/env bash
#
# devrails :: posttooluse-logger (Claude Code PostToolUse hook)
# Adapted from github/awesome-copilot — session-logger
#
# Logs every file-editing tool use to logs/devrails/session.log as JSON.
# Useful for audit trails and reviewing what the agent changed in a session.
# Always exits 0 — never blocks anything.
#
# Set SKIP_LOGGING=true to disable.
# Set DEVRAILS_LOG_DIR=path to change the log location (default: logs/devrails).

set -uo pipefail

[ "${SKIP_LOGGING:-}" = "true" ] && exit 0

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // "unknown"' 2>/dev/null)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

LOG_DIR="${DEVRAILS_LOG_DIR:-logs/devrails}"
mkdir -p "$LOG_DIR"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

jq -n \
  --arg ts        "$timestamp" \
  --arg tool      "$tool_name" \
  --arg file      "$file_path" \
  --arg cwd       "$(pwd)" \
  '{timestamp: $ts, tool: $tool, file: $file, cwd: $cwd}' \
  >> "$LOG_DIR/session.log" 2>/dev/null || true

exit 0
