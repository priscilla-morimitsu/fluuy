---
name: Component Library Builder
description: Use this skill to create or review reusable components with shadcn/ui, Tailwind, Radix UI and Liquid Glass without glow.
---

# Component Library Builder

Create reusable, consistent, accessible components aligned with the design system.

## Mandatory base

- shadcn/ui
- Radix UI
- Tailwind CSS
- Liquid Glass without glow
- design system tokens

## Define for each component

- name
- purpose
- anatomy
- variants
- states
- tokens used
- responsive behavior
- accessibility rules
- usage examples
- anti-patterns

## Priority components

- Button
- Input
- Select
- Checkbox
- Radio
- Switch
- Card
- Modal
- Drawer
- Toast
- Tooltip
- Tabs
- Table
- Badge
- Command Palette
- Empty State
- Loading State
- Error State
- Navigation
- Sidebar
- Pricing Card
- Onboarding Stepper

## Visual rules

- Do not use glow
- Do not use colors outside the design system
- Do not change fonts
- Do not create radius values outside tokens
- Do not create unnecessary variants
- Do not duplicate an existing component without a strong reason

## Component quality checklist

A component is ready only when it has:

- accessible name/label
- keyboard support
- visible focus
- responsive behavior
- light/dark mode behavior
- all major states
- clear variant naming
- implementation notes

## Fluuy CRUD building blocks (reuse, don't recreate)

- `components/crud/data-table.tsx` — `onRowClick` makes listing rows clickable (`cursor-pointer`) to open the edit drawer; clicks on links/buttons/menus are ignored.
- `components/ui/form-drawer.tsx` `FormDrawerForm` — `confirmOnSave`/`confirmTitle`/`initialValues`/`fieldLabels` show an AlertDialog listing changed fields before persisting an edit.
- `components/forms/status-switch-item.tsx` `StatusSwitchItem` — options-driven Choice Card with impact confirmation; placed as the first form field. 2 options → switch (no danger affordance); 3+ → pills; the blocked state uses a danger-tone option. Spec: `.claude/docs/specs/components/status/`.
- `components/ui/origin-badge.tsx` `OriginBadge` — read-only origin badge (icon+color per origin). Origin is system-assigned, never an editable form field. Spec: `.claude/docs/specs/components/origin-badge-spec.json`.
- Feedback via `sonner` toast on every create/edit/sensitive action (pt-BR).
