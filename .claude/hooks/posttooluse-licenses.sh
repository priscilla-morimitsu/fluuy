#!/usr/bin/env bash
#
# devrails :: posttooluse-licenses (Claude Code PostToolUse hook)
# Adapted from github/awesome-copilot — dependency-license-checker
#
# After Claude writes package.json, checks whether newly added npm packages
# carry a restrictive license (GPL, AGPL, LGPL, SSPL, etc.) and warns.
# Always exits 0 — license decisions are business calls, not auto-blocks.
#
# Set SKIP_LICENSE_CHECK=true to disable.
# Set LICENSE_ALLOWLIST=pkg1,pkg2 to exempt specific packages.

set -uo pipefail

[ "${SKIP_LICENSE_CHECK:-}" = "true" ] && exit 0

command -v jq >/dev/null 2>&1  || exit 0
command -v npm >/dev/null 2>&1 || exit 0
command -v git >/dev/null 2>&1 || exit 0

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

# Only act when package.json is modified
case "${file_path##*/}" in
  package.json) ;;
  *) exit 0 ;;
esac

# Find newly added packages by diffing HEAD..working tree
new_pkgs="$(git diff HEAD -- "$file_path" 2>/dev/null \
  | grep '^\+' | grep -v '^\+\+\+' \
  | grep -oE '"(@?[a-zA-Z0-9][a-zA-Z0-9_./-]*)"\s*:' \
  | grep -oE '"(@?[a-zA-Z0-9][a-zA-Z0-9_./-]*)' \
  | tr -d '"' \
  | grep -vE '^(name|version|description|main|types|license|author|scripts|dependencies|devDependencies|peerDependencies|engines|files|keywords|repository|bugs|homepage|private|type)$' \
  | sort -u)"

[ -z "$new_pkgs" ] && exit 0

BLOCKED="GPL|AGPL|LGPL|SSPL|EUPL|OSL|CC-BY-NC|CC-BY-ND|CDDL|EPL|MPL-2"

IFS=',' read -ra ALLOWLIST <<< "${LICENSE_ALLOWLIST:-}"

violations=()
while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue

  # Check allowlist
  skip=false
  for allow in "${ALLOWLIST[@]}"; do
    [ "$(printf '%s' "$allow" | xargs)" = "$pkg" ] && skip=true && break
  done
  "$skip" && continue

  license="$(npm view "$pkg" license 2>/dev/null || echo "UNKNOWN")"
  if printf '%s' "$license" | grep -qE "$BLOCKED"; then
    violations+=("$pkg ($license)")
  fi
done <<< "$new_pkgs"

if [ "${#violations[@]}" -gt 0 ]; then
  {
    echo "devrails license-checker — restrictive license(s) detected in new dependencies:"
    for v in "${violations[@]}"; do echo "  - $v"; done
    echo "Review before shipping. Add to LICENSE_ALLOWLIST to suppress individual packages."
  } >&2
fi

exit 0
