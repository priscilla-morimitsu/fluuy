#!/usr/bin/env bash
#
# devrails :: check-code-quality
#
# Usage: check-code-quality.sh <file> [<file> ...]
# Detects TypeScript/JavaScript code quality violations that are hard to enforce
# via linter config alone:
#   - `any` type usage in TypeScript files
#   - leftover console.log calls in non-test source files
#   - empty catch blocks that silently swallow errors
#
# Exit 0 = clean, exit 1 = violations found.

set -uo pipefail

violations=0
report() { echo "  [check-code-quality] $1" >&2; violations=$((violations+1)); }

is_test_file() {
  local f="$1"
  case "$f" in
    *.test.*|*.spec.*) return 0 ;;
  esac
  case "$(dirname "$f")" in
    */__tests__|*/__tests__|*/test|*/tests) return 0 ;;
  esac
  return 1
}

for f in "$@"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
    *) continue ;;
  esac

  # --- No `any` type (TypeScript only) ----------------------------------------
  case "$f" in
    *.ts|*.tsx)
      while IFS= read -r lineno; do
        [ -n "$lineno" ] && report "$f:$lineno: \`any\` type — use \`unknown\` and narrow, or a precise type."
      done < <(grep -nE '(: any\b|as any\b|Array<any>|Promise<any>)' "$f" 2>/dev/null | grep -v '^\s*//' | cut -d: -f1 || true)
      ;;
  esac

  # --- No console.log in production code --------------------------------------
  if ! is_test_file "$f"; then
    while IFS= read -r lineno; do
      [ -n "$lineno" ] && report "$f:$lineno: \`console.log\` — remove debug output before committing."
    done < <(grep -n 'console\.log' "$f" 2>/dev/null | grep -v '^\s*//' | cut -d: -f1 || true)
  fi

  # --- No empty catch blocks --------------------------------------------------
  while IFS= read -r lineno; do
    [ -n "$lineno" ] && report "$f:$lineno: empty \`catch\` block — handle the error, rethrow with context, or log it."
  done < <(grep -nE 'catch\s*(\([^)]*\))?\s*\{\s*\}' "$f" 2>/dev/null | cut -d: -f1 || true)

done

if [ "$violations" -gt 0 ]; then
  echo "check-code-quality: $violations issue(s) found." >&2
  exit 1
fi
exit 0
