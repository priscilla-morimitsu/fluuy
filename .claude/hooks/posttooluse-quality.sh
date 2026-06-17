#!/usr/bin/env bash
#
# devrails :: Claude Code PostToolUse adapter
# After Claude writes/edits a TS/JS file, run the project's own typecheck/lint
# scripts and surface failures (exit 2) so Claude fixes them immediately.
# Delegates to package.json scripts — does nothing if they don't exist.

set -uo pipefail

input="$(cat)"
fp="$(DR_IN="$input" node -e 'try{const j=JSON.parse(process.env.DR_IN);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}' 2>/dev/null)"

[ -z "$fp" ] && exit 0
case "$fp" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

# Find nearest package.json by walking up.
dir="$(cd "$(dirname "$fp")" 2>/dev/null && pwd)"; root=""
while [ -n "$dir" ] && [ "$dir" != "/" ]; do
  [ -f "$dir/package.json" ] && root="$dir" && break
  dir="$(dirname "$dir")"
done
[ -z "$root" ] && exit 0
cd "$root" || exit 0

if   [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then RUN="pnpm run";
elif [ -f yarn.lock ]      && command -v yarn >/dev/null 2>&1; then RUN="yarn";
elif command -v npm >/dev/null 2>&1;                          then RUN="npm run --silent";
else exit 0; fi

has() { node -e 'const s=(require("./package.json").scripts)||{};process.exit(s[process.argv[1]]?0:1)' "$1" 2>/dev/null; }

fail=""
for s in typecheck lint; do
  has "$s" || continue
  if ! out="$($RUN "$s" 2>&1)"; then fail="${fail}\n[$s] failed:\n${out}\n"; fi
done

if [ -n "$fail" ]; then
  echo -e "devrails quality gate failed after editing ${fp}:${fail}" >&2
  exit 2
fi
exit 0
