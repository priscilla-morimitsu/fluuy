---
name: Frontend Implementation Bridge
description: Use this skill to translate design decisions into maintainable frontend implementation using Next.js, React, Tailwind, shadcn/ui, Radix UI and Liquid Glass without glow.
---

# Frontend Implementation Bridge

Translate UI/UX decisions into clean, scalable frontend implementation.

## Stack assumptions

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- Ein UI / Liquid Glass

## Implementation principles

- Use shadcn/ui as the component foundation
- Use Liquid Glass without glow
- Keep tokens centralized
- Avoid hardcoded colors
- Avoid arbitrary radius values
- Use CSS variables where the design system defines them
- Keep components composable
- Preserve accessibility from Radix/shadcn primitives
- Avoid overengineering
- Avoid visual one-offs

## Always check

- Is this component already available in shadcn/ui?
- Is Liquid Glass necessary here?
- Does it respect tokens?
- Does it preserve keyboard support?
- Does it work in dark mode?
- Does it degrade gracefully?
- Is the code easy to reuse?

## Fluuy CRUD interaction conventions (mandatory)

These are project-wide rules for every CRUD screen. Reuse the shared components — do not recreate them. Full specs: `.claude/docs/specs/crud/fluuy_crud_screens_standard_spec_prompt.json`, `.claude/docs/specs/layout/form-drawer-spec.json`, `.claude/docs/specs/components/status/status-switch-spec.json`, `.claude/docs/specs/components/origin-badge-spec.json`.

- **Clickable rows** — listing table rows are `cursor-pointer` and open the row's edit drawer. Use `DataTable`'s `onRowClick` (`components/crud/data-table.tsx`); clicks on links/buttons/menus are ignored. Gate on write permission.
- **Confirm before save (edit)** — submitting an edit opens an AlertDialog listing the changed fields before persisting. Use `FormDrawerForm`'s `confirmOnSave` / `confirmTitle` / `initialValues` / `fieldLabels` (`components/ui/form-drawer.tsx`). Raw `<form>`s replicate the same dialog.
- **Toast feedback** — every create/edit/sensitive action shows a `sonner` toast (success/error), pt-BR.
- **Status component** — the ativo/inativo/bloqueado lifecycle uses `StatusSwitchItem` (`components/forms/status-switch-item.tsx`), never a raw Select/Segmented. Two-state entities pass only the two options (switch, no danger affordance); it sits as the first form field. Domain status machines (order/appointment) keep their own controls.
- **Origin is system-assigned** — forms have NO editable "Origem" field. The system sets `source` by entry point (panel ⇒ `manual`; webhooks/IA ⇒ `ai`/`whatsapp`; site ⇒ `website`); on panel update the original `source` is preserved (omitted on write). Display it read-only with `OriginBadge` (`components/ui/origin-badge.tsx`) — distinct icon+color per origin (Agente IA, Manual/Usuário, Site, …).

## Output format

When proposing implementation, include:

1. component strategy
2. files/components affected
3. token usage
4. accessibility considerations
5. responsive behavior
6. implementation risks
