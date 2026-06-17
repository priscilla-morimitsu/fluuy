---
title: Multi-tenant & Multi-niche Isolation
description: Tenant isolation, niche/template/feature-flag conventions specific to Fluuy
globs: []
alwaysApply: true
---

- Every query against a tenant-scoped table (`tenants`, `customers`, `customer_entities`, `products`, `services`, `plans`, `requests`, `conversations`, `messages`, `agent_configs`, `tenant_workflows`, `workflow_runs`, `tenant_features`) MUST filter by `tenant_id`. Never rely on the client to supply it — derive it from the authenticated session/JWT.
- Never accept `tenant_id` as a raw user-controlled input on write paths; it must come from the resolved session/tenant context.
- Routes under an admin/platform scope must check for the `platform_admin` role explicitly. Niches and templates can only be created/edited by `platform_admin`, never by tenant-scoped roles.
- Role checks (`tenant_owner`, `tenant_manager`, `tenant_operator`, `tenant_viewer`) must happen server-side on every mutating endpoint/server action. `tenant_viewer` must never reach a write path.
- Niche-specific fields belong in `custom_data` (jsonb), validated at runtime against the relevant `templates.fields` definition for that niche + entity type — never hardcode niche-specific fields as fixed columns or as `if (niche === 'pet_services')` branches in application code.
- A feature behind a `feature_key` (see `features`/`tenant_features`/`billing_plans`) must be checked before the corresponding module's UI or endpoint executes. Don't ship a module without its feature-flag gate.
- The AI agent must never write to a tenant-scoped table without a resolved `tenant_id`, and must stop generating responses once `conversations.agent_paused = true` or a handoff is active.
- The AI agent must never invent data (price, availability, schedule) that isn't present in the tenant's own catalog/records.
- Migrations that add a tenant-scoped table must include an index on `tenant_id` (and a GIN index on `custom_data` if it will be queried/filtered).
