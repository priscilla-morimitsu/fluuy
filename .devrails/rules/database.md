---
title: Database
description: Database access patterns, query safety, migration discipline, and data integrity requirements
globs:
  - "lib/**/*.ts"
  - "prisma/**"
  - "drizzle/**"
  - "migrations/**"
alwaysApply: false
---

## Query safety

- Never concatenate user input into SQL strings. Use parameterized queries or ORM query builders exclusively.
- Never select `*` on user-facing endpoints — name the columns you need. This avoids leaking new sensitive fields added to the schema later.
- Every `findMany` / list query must have an explicit `take`/`limit`. No unbounded reads in request handlers.
- Sensitive fields (hashed passwords, tokens, internal flags, soft-delete markers) must be explicitly excluded when not needed.

## N+1 prevention

- A DB call inside a loop is always a bug. Use `include`, `with`, or a batch query instead.
- Prefer `Promise.all([...])` for parallel independent queries over sequential `await`.
- All list endpoints must support cursor-based or offset pagination. Include `cursor`, `take`, and `skip` in the query and in the API response.

## Indexes

- Every foreign key column must have an index.
- Columns used in `WHERE`, `ORDER BY`, or `JOIN ON` without an index must be justified or indexed.
- Unique constraints enforced at the DB level (not just in application code).

## Migration discipline

- Migrations are always additive first. Add the new column/table, deploy, then remove the old one in a second migration.
- A new `NOT NULL` column on an existing table requires a default value or a backfill script before the constraint is applied.
- Dropping a column/table: confirm the column is no longer referenced in any deployed code before the migration runs.
- Large-table migrations that lock rows must use batching or a background job. Document the expected lock duration.
- Every migration must be reversible or the irreversibility must be documented with a rollback plan.

## Data integrity

- Define `ON DELETE` behavior on every foreign key: `CASCADE`, `RESTRICT`, or `SET NULL`. The choice must be intentional, not the ORM default.
- Multi-table writes that must succeed or fail together go in a transaction.
- Concurrent update scenarios (stock, balance, counters) require optimistic locking (`updatedAt` version) or a DB-level lock — never last-write-wins.
- Soft deletes: if using `deletedAt`, every query that reads live records must filter `WHERE deletedAt IS NULL`.
