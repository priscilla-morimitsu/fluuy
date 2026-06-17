---
title: Next.js App Router Patterns
description: Conventions for Next.js App Router code — Server vs Client Components, data, actions, env
globs: [app/**, components/**, lib/**, src/**]
alwaysApply: false
---

- Components are Server Components by default. Add `"use client"` only for interactivity (state, effects, event handlers, browser APIs). Push it as far down the tree as possible.
- Never import server-only code (DB clients, secrets, `fs`) into a `"use client"` file. Guard server modules with `import "server-only"`.
- Fetch data in Server Components with `async`/`await`; avoid client `useEffect` fetch waterfalls. Parallelize independent requests with `Promise.all`. Co-locate data access in `lib/`.
- Treat every Server Action as a public endpoint: re-check auth/authorization and validate all inputs with a schema on the server. The UI hiding a button is not access control.
- Use Route Handlers for webhooks/integrations; prefer Server Actions for your own UI mutations. Validate bodies and params; return correct status codes; never leak stack traces.
- Only `NEXT_PUBLIC_*` variables reach the browser — never put secrets there. Access secrets only in server contexts.
- Use `next/image` and `next/font`. Define metadata via the `metadata` export, not manual `<head>` tags.
- Handle loading and error states with `loading.tsx` / `error.tsx`. Be explicit about static vs dynamic rendering and document any `dynamic`/`revalidate` use.
