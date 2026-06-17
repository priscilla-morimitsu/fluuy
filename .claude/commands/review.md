---
name: review
description: Run a full guard-rails review of recent changes (code quality, security, accessibility) using the specialist subagents.
---

Run a complete review of the changes in this session (or the diff the user points to).

1. Delegate to the `code-reviewer` subagent for quality and correctness.
2. If the change touches auth, data, input, secrets, or external requests, delegate to the `security-auditor` subagent.
3. If the change touches UI, delegate to the `accessibility-auditor` subagent.

Then consolidate their findings into a single report, grouped by severity (Blocking → Recommended → Nit), de-duplicated, with file locations and concrete fixes. End with a one-line verdict: ready to merge, or blocked with the count of blocking issues.
