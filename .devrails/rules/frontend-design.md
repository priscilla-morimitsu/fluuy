---
title: Frontend & Design Skills
description: Which installed skills/MCPs to reach for when building or reviewing UI
globs: []
alwaysApply: true
---

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
