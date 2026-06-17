---
name: new-feature
description: Start a new feature the guard-railed way — PRD to spec to implementation, with review at the end.
---

Drive a new feature through the full workflow. Do not jump straight to code.

1. **Clarify intent.** Restate the feature and confirm scope with the user. If a PRD is warranted and missing, draft one from `.devrails/templates/prd.md`.
2. **Spec.** Produce a technical spec from `.devrails/templates/spec.md` covering data model, the Server Action / Route Handler surface, component structure, edge cases, security, accessibility, and the test plan. Confirm it with the user before building. Record irreversible decisions as an ADR from `.devrails/templates/adr.md`.
3. **Implement.** Build to the approved spec, applying the project's conventions (the Next.js, code-standards, accessibility, and security skills/rules). Flag any deviation from the spec instead of making it silently.
4. **Test.** Use the `test-writer` subagent to add coverage for the new behavior.
5. **Review.** Run `/review` and resolve blocking findings before declaring done.

The feature description follows: $ARGUMENTS
