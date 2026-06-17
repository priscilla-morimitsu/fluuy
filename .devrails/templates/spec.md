# Spec: <Feature name>

> Technical specification — the *how*. Derived from the PRD. Confirm before building.

## Summary
What is being built, in one paragraph, and the problem it solves.

## Scope
- **In scope:** ...
- **Out of scope:** ...

## Data model
Schema additions/changes (tables, columns, relations, migrations). Note any backfill or data migration needed.

## Interface / surface
- **Server Actions:** signatures, inputs (with validation schema), outputs.
- **Route Handlers:** routes, methods, request/response shapes, status codes.
- **Components:** new/changed components and their props; Server vs Client.

## Behavior & edge cases
Happy path plus the edge cases and failure modes, and how each is handled.

## Security considerations
Auth/authorization checks, input validation, data exposure. (See the security-review skill.)

## Accessibility considerations
Keyboard, focus, labels, contrast for any new UI. (See the accessibility-review skill.)

## Test plan
What will be tested and at which level (unit / integration / e2e).

## Rollout
Flags, migrations order, backward compatibility, how to revert.

## Open questions
- Question 1
