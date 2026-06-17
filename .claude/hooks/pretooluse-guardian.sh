#!/usr/bin/env bash
#
# devrails :: pretooluse-guardian (Claude Code PreToolUse hook)
# Adapted from github/awesome-copilot — tool-guardian
#
# Blocks dangerous Bash operations before Claude executes them:
# recursive deletes, force-pushes to protected branches, database drops,
# world-writable permissions, and piping remote content to a shell.
#
# Exit 0 = allow, exit 2 = block (stderr is shown to the model).
# Set SKIP_TOOL_GUARDIAN=true to disable entirely.

set -uo pipefail

[ "${SKIP_TOOL_GUARDIAN:-}" = "true" ] && exit 0

input="$(cat)"

command -v jq >/dev/null 2>&1 || exit 0

tool_name="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)"

# Only relevant for the Bash tool
[ "$tool_name" != "Bash" ] && exit 0

cmd_str="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd_str" ] && exit 0

# Optional allowlist: comma-separated literal strings to exempt
IFS=',' read -ra ALLOWLIST <<< "${TOOL_GUARDIAN_ALLOWLIST:-}"
for allow in "${ALLOWLIST[@]}"; do
  allow="$(printf '%s' "$allow" | xargs)"
  [ -n "$allow" ] && printf '%s' "$cmd_str" | grep -qF "$allow" && exit 0
done

threats=()
add() { threats+=("$1"); }

# Recursive deletes from dangerous paths
printf '%s' "$cmd_str" | grep -qE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+/'  && add "recursive delete from root (rm -rf /…)"
printf '%s' "$cmd_str" | grep -qE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+~'  && add "recursive delete of home directory (rm -rf ~…)"
printf '%s' "$cmd_str" | grep -qE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+\.' && add "recursive delete of current directory (rm -rf .)"

# Force-push to protected branches
printf '%s' "$cmd_str" | grep -qE 'git\s+push\s+.*(--force|-f)\b.*\s+(origin\s+)?(main|master|production|prod|release)\b' \
  && add "force-push to a protected branch (main/master/production)"

# Database destructive operations
printf '%s' "$cmd_str" | grep -qiE '\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b' \
  && add "destructive database operation (DROP TABLE / DROP DATABASE / TRUNCATE)"

# World-writable permissions on system paths
printf '%s' "$cmd_str" | grep -qE 'chmod\s+[0-9]*777\s+/' \
  && add "world-writable permission on a system path (chmod 777 /…)"

# Piping remote content straight into a shell
printf '%s' "$cmd_str" | grep -qE '(curl|wget)\s+[^|]+\|\s*(ba)?sh' \
  && add "piping remote content directly into a shell (curl/wget | bash/sh)"

# Privileged recursive operations
printf '%s' "$cmd_str" | grep -qE 'sudo\s+(rm|chmod|chown)\s+-[a-zA-Z]*r' \
  && add "privileged recursive file operation (sudo rm/chmod/chown -r…)"

if [ "${#threats[@]}" -gt 0 ]; then
  {
    echo "devrails tool-guardian BLOCKED this Bash command:"
    for t in "${threats[@]}"; do echo "  - $t"; done
    echo ""
    echo "If this is intentional, set SKIP_TOOL_GUARDIAN=true or add a pattern to TOOL_GUARDIAN_ALLOWLIST."
  } >&2
  exit 2
fi

exit 0
