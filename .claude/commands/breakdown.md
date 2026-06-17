# /breakdown

Decomposes a high-level initiative into a hierarchical plan: Epic → Features → Tasks → Test cases. Produces a structured, actionable breakdown ready for execution.

## Usage

```
/breakdown <epic or initiative description>
```

## Output structure

```markdown
## Epic: <name>
**Goal:** <one sentence>
**Definition of done:** <measurable criteria>

---

### Feature 1: <name>
**Why:** <user value or technical need>
**Scope:** <what's included / explicitly excluded>

#### Tasks
- [ ] T1.1 — <atomic implementation step> (~<effort: XS/S/M/L>)
- [ ] T1.2 — ...

#### Test cases
- [ ] TC1.1 — WHEN <condition> THEN <expected behavior> (unit)
- [ ] TC1.2 — WHEN <condition> THEN <expected behavior> (integration)

---

### Feature 2: <name>
...

---

## Dependencies
<which feature must complete before another can start>

## Risks
<what could block or expand scope, with mitigation>
```

## Rules

- Each task must be atomic: one person, one session, one commit.
- Each test case maps to exactly one requirement (traceable).
- Scope exclusions are as important as inclusions — call them out explicitly.
- Effort estimates use T-shirt sizes: XS (<1h), S (1–3h), M (3–8h), L (1–2d).
- If the epic is unclear, ask one clarifying question before decomposing.
