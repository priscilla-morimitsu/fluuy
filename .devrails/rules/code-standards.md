---
title: Code Standards
description: TypeScript/JavaScript quality baseline for the whole project
globs: []
alwaysApply: true
---

- TypeScript runs in `strict` mode; do not weaken `tsconfig` to silence errors.
- No `any`. Use `unknown` and narrow. Reserve `as` casts for unavoidable cases and comment why.
- Prefer precise types: discriminated unions, `readonly`, literal types. Derive types from a single source (e.g. `z.infer`) instead of duplicating shapes. Type exported function boundaries explicitly.
- Names describe intent (`usersAwaitingApproval`, `isLoading`). One responsibility per module; short, single-purpose functions.
- Never swallow errors with an empty `catch`. Handle, rethrow with context, or log. Fail fast at boundaries. Never expose internal error details (stack traces, DB messages) to users.
- Comments explain *why*, not *what*. No commented-out code, leftover `console.log`, or ownerless `TODO`s in committed code.
- Prefer the standard library and existing dependencies before adding a package. Don't introduce a second library that duplicates an existing one.
