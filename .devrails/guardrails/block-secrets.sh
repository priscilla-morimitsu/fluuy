#!/usr/bin/env bash
#
# devrails :: block-secrets
#
# Usage: block-secrets.sh <file> [<file> ...]
# Scans the given files for hardcoded secrets and secrets leaking into
# client-reachable code. Reports every matching line with its line number.
# Exit 0 = clean, exit 1 = violations found.
#
# Patterns sourced from devrails + github/awesome-copilot secrets-scanner.
# This runs from `devrails check` (git hook / CI) and `devrails audit`.

set -uo pipefail

violations=0
report() { echo "  [block-secrets] $1" >&2; violations=$((violations+1)); }

# scan <file> <grep-pattern> <message>
scan() {
  local f="$1" pattern="$2" msg="$3" lineno
  while IFS= read -r lineno; do
    [ -n "$lineno" ] && report "$f:$lineno: $msg"
  done < <(grep -niE "$pattern" "$f" 2>/dev/null | grep -v '^\s*//' | cut -d: -f1 || true)
}

for f in "$@"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.env*|*.json|*.yml|*.yaml|*.py|*.go|*.rb) ;;
    *) continue ;;
  esac

  # Generic hardcoded credential assignment
  scan "$f" \
    "(api[_-]?key|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd)[\"'][[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}" \
    "hardcoded credential (key/secret/token/password assigned a literal value)."

  # AWS
  scan "$f" "(AKIA|ASIA)[A-Z0-9]{16}" \
    "possible AWS access key ID."

  # GCP service account key
  scan "$f" '"type"\s*:\s*"service_account"' \
    "possible GCP service account key."

  # Azure connection string / client secret
  scan "$f" "DefaultEndpointsProtocol=https;AccountName=" \
    "possible Azure storage connection string."
  scan "$f" "AccountKey=[A-Za-z0-9+/]{60,}={0,2}" \
    "possible Azure storage account key."

  # Generic sk-... key (OpenAI, Stripe, etc.)
  scan "$f" "sk-[A-Za-z0-9]{20,}" \
    "possible API secret key (sk-... pattern — OpenAI, Stripe, etc.)."

  # Stripe
  scan "$f" "(sk|rk)_live_[A-Za-z0-9]{24,}" \
    "possible Stripe live secret/restricted key."

  # Slack
  scan "$f" "xox[baprs]-[A-Za-z0-9-]{10,}" \
    "possible Slack token."

  # Twilio
  scan "$f" "SK[a-f0-9]{32}" \
    "possible Twilio API key SID."

  # SendGrid
  scan "$f" "SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,}" \
    "possible SendGrid API key."

  # Private key material
  scan "$f" "-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----" \
    "private key material embedded in source."

  # GitHub tokens
  scan "$f" "gh[pousr]_[A-Za-z0-9]{30,}" \
    "possible GitHub personal access token."
  scan "$f" "github_pat_[A-Za-z0-9_]{80,}" \
    "possible GitHub fine-grained personal access token."

  # JWT (raw token, not a template)
  scan "$f" "eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}" \
    "possible hardcoded JWT token."

  # Database connection strings with credentials
  scan "$f" "(mongodb|postgres|postgresql|mysql|redis):\/\/[^:]+:[^@]{4,}@" \
    "database connection string with embedded credentials."

  # Next.js: secret in NEXT_PUBLIC_ (reaches browser)
  scan "$f" \
    "NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)" \
    "secret exposed via NEXT_PUBLIC_ variable (reaches the browser)."

  # Next.js: server secret accessed in "use client" component
  if grep -q '"use client"' "$f" 2>/dev/null; then
    scan "$f" \
      "process\.env\.[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)" \
      'server secret (process.env) referenced inside a "use client" component.'
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "block-secrets: $violations potential secret exposure(s) found. Move secrets to server-only env vars." >&2
  exit 1
fi
exit 0
