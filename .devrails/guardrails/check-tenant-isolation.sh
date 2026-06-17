#!/usr/bin/env bash
# check-tenant-isolation.sh — flags obvious multi-tenant isolation smells.
# Contract: accept file paths as positional args, write violations to stderr
# as "  [check-tenant-isolation] file:line: message", exit 0 clean / 1 violations.
set -euo pipefail

violations=0
self="check-tenant-isolation"

is_target() {
  case "$1" in
    *.ts|*.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

for file in "$@"; do
  [ -f "$file" ] || continue
  is_target "$file" || continue
  case "$file" in
    */node_modules/*|*/.next/*|*/dist/*) continue ;;
  esac

  # Prisma calls on tenant-scoped models without a tenant_id in the same statement.
  # Heuristic: a `prisma.<tenantModel>.<verb>(` call followed (within ~6 lines) by
  # neither `tenant_id` nor `tenantId` is flagged for manual review.
  # NB: "tenant" itself is intentionally excluded — the Tenant model is the
  # root entity and has no tenant_id column (it IS the tenant). Platform-admin
  # code legitimately creates/updates it without a tenant_id filter.
  models='customer|customerEntity|product|service|plan|request|conversation|message|agentConfig|tenantWorkflow|workflowRun|tenantFeature|tenantUser'

  awk -v file="$file" -v models="$models" -v self="$self" '
    BEGIN { v = 0 }
    {
      lines[NR] = $0
      if ($0 ~ "prisma\\.(" models ")\\.(findMany|findFirst|update|updateMany|delete|deleteMany|create)\\(") {
        start = NR
        end = NR + 6
        found = 0
        for (i = start; i <= end && i <= NR + 6; i++) {
          # window check happens after full read; defer to END via stored ranges
        }
        pending[NR] = 1
      }
    }
    END {
      for (ln in pending) {
        found = 0
        for (i = ln; i <= ln + 6 && i <= NR; i++) {
          # userId also counts: querying my-own-rows-across-tenants (e.g. a
          # users own tenant_user memberships) is a valid isolation strategy,
          # not a leak, since it never crosses into another users data. This
          # comment avoids apostrophes on purpose: it sits inside a single-
          # quoted awk program passed from bash, where a literal apostrophe
          # would terminate the quoting and break the script.
          if (lines[i] ~ /tenant_id|tenantId|userId/) { found = 1; break }
        }
        if (!found) {
          printf "  [%s] %s:%d: prisma call on a tenant-scoped model with no tenant_id/tenantId nearby — verify isolation\n", self, file, ln
          v = 1
        }
      }
      exit v
    }
  ' "$file" || violations=1

  # Hardcoded niche branching is a smell — niche logic belongs in templates/custom_data.
  if grep -nE "niche\s*===?\s*['\"]" "$file" >/dev/null 2>&1; then
    grep -nE "niche\s*===?\s*['\"]" "$file" | while IFS=: read -r lineno _; do
      printf "  [%s] %s:%d: hardcoded niche branching — move niche-specific behavior to templates/custom_data\n" "$self" "$file" "$lineno"
    done
    violations=1
  fi
done

exit $violations
