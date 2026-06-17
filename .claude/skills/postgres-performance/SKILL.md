---
name: postgres-performance
description: Postgres indexing and query-performance patterns specific to Fluuy's multi-tenant schema (tenant_id, custom_data jsonb, search). Apply to files matching: prisma/**, migrations/**, lib/**/*.ts.
---

# Postgres Performance — Fluuy

Use **Postgres MCP Pro** (`postgres-mcp-pro` in `.mcp.json`, dev database only) to validate everything below empirically: `EXPLAIN (ANALYZE, BUFFERS)` before/after, and hypothetical-index testing via `hypopg` before creating a real index. Never run tuning against the production connection string.

## tenant_id — the mandatory index

Every tenant-scoped table (`tenants`, `customers`, `customer_entities`, `products`, `services`, `plans`, `requests`, `conversations`, `messages`, `agent_configs`, `tenant_workflows`, `workflow_runs`, `tenant_features`) must have a B-tree index on `tenant_id`:

```prisma
model Customer {
  id       String @id @default(uuid())
  tenantId String
  // ...
  @@index([tenantId])
}
```

- If a table is almost always queried by `tenant_id` + one more filter (status, type, createdAt), use a **composite index** `(tenant_id, <filter>)` instead of two separate indexes — Postgres can't combine two single-column B-trees as efficiently as one composite for this access pattern.
- Composite indexes the schema will need from day one:
  - `customers`: `(tenant_id, status)`, `(tenant_id, phone)` (agent looks up customer by phone on every inbound WhatsApp message)
  - `conversations`: `(tenant_id, status)`, `(tenant_id, last_message_at)` (dashboard/inbox sort)
  - `messages`: `(tenant_id, conversation_id, created_at)` (history pagination)
  - `requests`: `(tenant_id, status)`, `(tenant_id, type)`
  - `products` / `services` / `plans`: `(tenant_id, active)`
  - `workflow_runs`: `(tenant_id, conversation_id, status)`

## custom_data (jsonb) — GIN indexes

`custom_data` holds niche-specific fields (pet species, vehicle plate, patient data, etc.) and gets filtered by the agent and by tenant UIs. A sequential scan over jsonb is expensive — index it:

```sql
-- containment / key-exists queries (custom_data @> '{"species": "dog"}')
CREATE INDEX idx_customer_entities_custom_data ON customer_entities USING GIN (custom_data);

-- targeted path queries are cheaper with a jsonb_path_ops GIN index
-- when you only ever query exact key/value containment, not key existence
CREATE INDEX idx_products_custom_data_path ON products USING GIN (custom_data jsonb_path_ops);
```

- Default to `jsonb_path_ops` unless you need the `?`/`?&`/`?|` "key exists" operators — it's smaller and faster for `@>` containment, which covers most agent lookups (e.g. "products where custom_data @> '{"species_indicated": "cat"}'").
- Only add the GIN index on tables where `custom_data` is actually filtered/searched (per the niche's template), not on every table reflexively — it has a real write-amplification cost on every insert/update.
- Combine with `tenant_id`: `WHERE tenant_id = $1 AND custom_data @> $2` — Postgres can use the `tenant_id` B-tree and the GIN index together via a bitmap AND; verify with `EXPLAIN` that both are used, not just one with a filter on the rest.

## Search (products/services by name, customer by name/phone)

- For prefix/substring search on `name`/`description` shown in the tenant's catalog UI, use `pg_trgm` + a GIN/GIN-trigram index instead of `LIKE '%term%'` table scans:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
  ```
- For the agent's own catalog lookups (structured, not free text — "do you have X service"), prefer exact/ILIKE on a normalized column or `custom_data` containment over trigram search; trigram is for human-facing search boxes, not agent intent matching.
- Don't reach for `tsvector`/full-text search until there's an actual multi-word relevance-ranking need (e.g. a future knowledge-base search) — it adds a generated column + index to maintain for no benefit on simple catalog lookups.

## Query shape rules (enforced statically by the `database` skill, validate here empirically)

- Every list endpoint: explicit `take`/`limit`, paginated, filtered by `tenant_id` first in the `WHERE` clause (helps the planner pick the right index when combined with a composite index).
- No `SELECT *` — Prisma `select`/`include` only the columns the response needs.
- N+1 from per-row sub-fetches (e.g. fetching `customer_entities` per `customer` in a loop) — use `include` or a single `WHERE customer_id IN (...)` batch query.

## Validation workflow with Postgres MCP Pro

1. Write the query (or let Prisma generate it; capture the SQL via `prisma.$queryRaw`/query logging).
2. `EXPLAIN (ANALYZE, BUFFERS)` it against the dev database through the MCP.
3. If a sequential scan shows up on a tenant-scoped table, propose the candidate index and re-test it as a **hypothetical index** (`hypopg`) before creating it for real.
4. Only add the index to the Prisma schema / migration once the hypothetical index measurably changes the plan.
5. Re-run `EXPLAIN` after the real migration to confirm the planner picks it up in the deployed environment too — the planner's choice can differ with real statistics (`ANALYZE`) vs. the hypothetical one.
