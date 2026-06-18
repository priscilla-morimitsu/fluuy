<!-- GENERATED from .devrails/rules/*.md (alwaysApply: true). Edit the rules and re-sync, not this file directly. -->

@AGENTS.md

# Project guard-rails

Always-on conventions for this project. Scoped conventions (Next.js, database, accessibility) are provided as skills under `.claude/skills/` and applied automatically when relevant.

## Code Standards
_TypeScript/JavaScript quality baseline for the whole project_

- TypeScript runs in `strict` mode; do not weaken `tsconfig` to silence errors.
- No `any`. Use `unknown` and narrow. Reserve `as` casts for unavoidable cases and comment why.
- Prefer precise types: discriminated unions, `readonly`, literal types. Derive types from a single source (e.g. `z.infer`) instead of duplicating shapes. Type exported function boundaries explicitly.
- Names describe intent (`usersAwaitingApproval`, `isLoading`). One responsibility per module; short, single-purpose functions.
- Never swallow errors with an empty `catch`. Handle, rethrow with context, or log. Fail fast at boundaries. Never expose internal error details (stack traces, DB messages) to users.
- Comments explain *why*, not *what*. No commented-out code, leftover `console.log`, or ownerless `TODO`s in committed code.
- Prefer the standard library and existing dependencies before adding a package. Don't introduce a second library that duplicates an existing one.

## Security
_Security requirements for input, auth, data, secrets, and AI/LLM integration_

The server never trusts the client.

- Secrets live only in server contexts — never in `"use client"` files, `NEXT_PUBLIC_*`, source code, or logs. No hardcoded keys, tokens, connection strings, or private keys.
- Validate every external input on the server with a schema (Server Action args, route bodies, query params, webhooks). Validate type, shape, length, and allowed values; reject unexpected fields. Client-side validation is UX only.
- Re-check authentication on the server for every protected action. Enforce per-resource authorization (ownership/role), not just "logged in" — guard against IDOR (changing an `id` to reach another user's data). Enforce at the data-access layer, not middleware alone.
- Use parameterized queries / safe ORM APIs; never concatenate SQL with user input. Avoid `dangerouslySetInnerHTML` (sanitize if unavoidable). Allow-list dynamic fetch/redirect targets (SSRF / open redirect).
- Return only the fields the client needs; never serialize whole DB records. Error responses are generic to users; details go to server logs.
- Set security headers (CSP where feasible, `nosniff`, `Referrer-Policy`, HSTS in prod). Session cookies: `httpOnly`, `secure`, `SameSite`. Protect state-changing requests against CSRF. Validate file uploads (type, size, storage) and never trust their content.

### AI / LLM security (OWASP LLM Top 10)

When the application integrates language models (OpenAI, Anthropic, Gemini, local models):

- **Prompt injection (LLM01)**: Never interpolate raw user input directly into a system prompt. Separate system instructions from user content structurally. Treat LLM output as untrusted data — validate and sanitize before acting on it or rendering it.
- **Insecure output handling (LLM02)**: Do not pass LLM output to `eval`, `exec`, shell commands, SQL, or `dangerouslySetInnerHTML` without sanitization. If the model produces code or structured data, parse and validate it with a schema before use.
- **Training data poisoning (LLM03)**: Document the provenance of any data used for fine-tuning. Do not use user-submitted content for training without review.
- **Excessive agency (LLM08)**: Agents should operate with minimum necessary permissions. Require explicit user confirmation before irreversible tool calls (delete, send, pay). Log all agentic actions.
- **Model access controls**: API keys for AI providers are secrets — store in environment variables, never in source. Rotate keys regularly. Set spend limits and rate limits on AI provider accounts.
- **Sensitive data in prompts (LLM06)**: Do not include PII, credentials, or internal system details in prompts unless strictly necessary. Log prompts only in environments where that is approved.
- **Supply chain (LLM05)**: Pin AI SDK versions. Evaluate model cards and terms of use before adopting a new model or provider.

## Multi-tenant & Multi-niche Isolation
_Tenant isolation, niche/template/feature-flag conventions specific to Fluuy_

- Every query against a tenant-scoped table (`tenants`, `customers`, `customer_entities`, `products`, `services`, `plans`, `requests`, `conversations`, `messages`, `agent_configs`, `tenant_workflows`, `workflow_runs`, `tenant_features`) MUST filter by `tenant_id`. Never rely on the client to supply it — derive it from the authenticated session/JWT.
- Never accept `tenant_id` as a raw user-controlled input on write paths; it must come from the resolved session/tenant context.
- Routes under an admin/platform scope must check for the `platform_admin` role explicitly. Niches and templates can only be created/edited by `platform_admin`, never by tenant-scoped roles.
- Role checks (`tenant_owner`, `tenant_manager`, `tenant_operator`, `tenant_viewer`) must happen server-side on every mutating endpoint/server action. `tenant_viewer` must never reach a write path.
- Niche-specific fields belong in `custom_data` (jsonb), validated at runtime against the relevant `templates.fields` definition for that niche + entity type — never hardcode niche-specific fields as fixed columns or as `if (niche === 'pet_services')` branches in application code.
- A feature behind a `feature_key` (see `features`/`tenant_features`/`billing_plans`) must be checked before the corresponding module's UI or endpoint executes. Don't ship a module without its feature-flag gate.
- The AI agent must never write to a tenant-scoped table without a resolved `tenant_id`, and must stop generating responses once `conversations.agent_paused = true` or a handoff is active.
- The AI agent must never invent data (price, availability, schedule) that isn't present in the tenant's own catalog/records.
- Migrations that add a tenant-scoped table must include an index on `tenant_id` (and a GIN index on `custom_data` if it will be queried/filtered).

## Frontend & Design Skills
_Which installed skills/MCPs to reach for when building or reviewing UI_

This project's UI is built with shadcn/ui + Tailwind on Next.js App Router. When doing
front-end or design work, prefer these installed skills over ad-hoc styling — they encode the
project's design language (shadcn/ui, "Liquid Glass without glow") and quality bar:

- **Building/evolving UI**: `design-system-architect` (tokens, components, screens),
  `component-library-builder` (reusable shadcn/Radix components), `frontend-design`
  (distinctive, intentional visual direction), `frontend-implementation-bridge`
  (design → Next.js/React/Tailwind code), `visual-ui-director` (premium visual polish).
- **Product surfaces**: `saas-dashboard-designer` (admin panels, data-heavy screens — the
  `/admin` and tenant areas), `product-flow-prototyper` (full flows, not isolated screens),
  `conversion-ux-optimizer` (login, pricing, lead capture), `mobile-first-responsive-designer`.
- **Content & trust**: `microcopy-content-designer` (labels, CTAs, empty/error states — keep
  the existing pt-BR voice), `trust-security-ux` (auth, permissions, destructive actions).
- **Review before shipping UI**: `accessibility-auditor-wcag` and `design-qa-review`. These
  complement the always-on `accessibility-wcag-22-aa` skill — accessibility is a requirement,
  not an afterthought.
- **Design ↔ dev handoff**: `figma-handoff-spec` for component specs, tokens, states,
  accessibility and responsive rules when documenting a screen for implementation.
- **Library docs**: use the `context7` MCP to pull current, version-correct docs for Next.js,
  Tailwind, shadcn/ui, Prisma, Auth.js, etc. instead of relying on memorized APIs (the repo
  also pins guidance in `AGENTS.md`: read `node_modules/next/dist/docs/` for this Next.js).

Keep these consistent with the existing `nextjs-app-router-patterns` and `database` skills and
the security/multi-tenant rules above — design choices never override server-side auth, tenant
isolation, or input validation.
