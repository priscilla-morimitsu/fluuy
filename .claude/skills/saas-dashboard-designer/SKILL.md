---
name: SaaS Dashboard Designer
description: Use this skill to design or review SaaS dashboards, admin panels, analytics screens, internal tools and data-heavy interfaces using shadcn/ui and Liquid Glass without glow.
---

# SaaS Dashboard Designer

Design dashboards that are clear, actionable and visually calm.

## Use for

- SaaS dashboards
- admin panels
- analytics pages
- internal tools
- CRM screens
- backoffice interfaces
- monitoring panels
- reports

## Dashboard principles

- Show the most important metric first
- Separate overview from details
- Make filters obvious
- Keep tables readable
- Avoid decorative charts
- Use clear empty states
- Use alerts only when needed
- Make actions easy to find
- Avoid data overload

## Components to consider

- metric cards
- charts
- tables
- filters
- date range picker
- status badges
- alerts
- activity feed
- quick actions
- empty states
- export actions

## Liquid Glass rules

Use subtle glass for dashboard panels, cards and widgets only when it preserves readability.

Never use glow, neon shadows or excessive blur.

## Output format

Deliver:

1. information hierarchy
2. dashboard layout
3. component recommendations
4. data states
5. accessibility notes
6. responsive behavior

## Fluuy CRUD list + form conventions (mandatory)

- Table rows are clickable (`cursor-pointer`) and open the edit drawer (`DataTable` `onRowClick`); the row actions menu still works.
- Editing confirms before saving via an AlertDialog listing the changed fields (`FormDrawerForm` `confirmOnSave`).
- `sonner` toasts on create/edit/sensitive actions (pt-BR).
- lifecycle status uses the options-driven `StatusSwitchItem` as the first form field (simple two-state shows no danger affordance); flow status machines keep their own controls.
- Origin (`source`) is system-assigned (no form field) and shown read-only with `OriginBadge` — distinct icon+color per origin (Agente IA, Manual/Usuário, Site, …).
