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

## Output format

When proposing implementation, include:

1. component strategy
2. files/components affected
3. token usage
4. accessibility considerations
5. responsive behavior
6. implementation risks
