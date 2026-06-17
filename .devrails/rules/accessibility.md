---
title: Accessibility (WCAG 2.2 AA)
description: Accessibility requirements for all user-facing UI
globs: [**/*.tsx, **/*.jsx]
alwaysApply: false
---

- Use semantic HTML: real `<button>` for actions, `<a href>` for navigation, `<nav>/<main>/<header>`, lists for lists. Never a clickable `<div>`. One `<h1>` per page; headings descend without skipping.
- Every form control has an associated `<label>` (placeholders are not labels).
- Everything operable by mouse is operable by keyboard (Tab/Enter/Space/Escape). Keep a visible focus indicator; never `outline: none` without a replacement. Logical focus order; no positive `tabindex`.
- Modals trap focus, restore focus to the trigger on close, and close on Escape. Prefer native `<dialog>` or a vetted accessible component.
- Images have meaningful `alt` (or `alt=""` if decorative); icon-only buttons have an accessible name. 
- Text contrast ≥ 4.5:1 (3:1 large/UI). Never use color as the only signal.
- Prefer native semantics over ARIA; if you add a `role`, you own its full keyboard behavior and state. Reflect state (`aria-expanded`, `aria-invalid`); announce async updates with `aria-live`.
- Associate field errors via `aria-describedby` + `aria-invalid`; move focus to the first error on submit.
- Respect `prefers-reduced-motion`; remain usable at 200% zoom and 320px width.
