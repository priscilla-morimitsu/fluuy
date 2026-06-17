# /spec-driven

Runs a 6-phase specification-driven workflow for any task: Analyze → Design → Implement → Validate → Reflect → Handoff. Produces traceable artifacts at each phase. Never skips a phase.

## Usage

```
/spec-driven <task or feature description>
```

## The 6 phases

### Phase 1: ANALYZE
- Read all provided code, docs, and tests relevant to the task.
- Write requirements in EARS notation: `WHEN [condition] THE SYSTEM SHALL [behavior]`
- Map dependencies, data flows, and edge cases.
- Assign a **Confidence Score (0–100%)** based on clarity and complexity.
- **Do not proceed until requirements are documented.**

### Phase 2: DESIGN
- **If Confidence > 85%**: write a full step-by-step implementation plan in `tasks.md`.
- **If Confidence 66–85%**: define a PoC/MVP with clear success criteria first.
- **If Confidence < 66%**: research phase — search docs, read examples, re-run ANALYZE.
- Write technical design in `design.md`: architecture, data flow, API contracts, error matrix.
- **Do not proceed until design is complete.**

### Phase 3: IMPLEMENT
- Code in small, testable increments.
- Implement from dependencies upward.
- Update `tasks.md` status in real time.
- **Do not merge/deploy until all steps are implemented and tested.**

### Phase 4: VALIDATE
- Run automated tests; document outputs and failures.
- Test edge cases and error paths explicitly.
- Verify performance for any hot paths.
- **Do not proceed with unresolved failures.**

### Phase 5: REFLECT
- Refactor for clarity and maintainability.
- Update all affected documentation.
- Log technical debt as issues with: location, reason, impact, remediation, effort estimate.
- Validate all success criteria from Phase 1.

### Phase 6: HANDOFF
- Write executive summary (1–3 bullets: what changed, why, impact).
- Prepare PR description with: summary, changelog entries, links to `requirements.md`, `design.md`, `tasks.md`.
- Archive intermediate artifacts to `.agent_work/` if needed.
- **Task is not complete until all handoff steps are done.**

## Retry protocol

If blocked at any phase: re-run ANALYZE → re-run DESIGN → adjust `tasks.md` → retry. Never proceed with unresolved ambiguity.

## Artifacts produced

| File | Phase | Content |
|------|-------|---------|
| `requirements.md` | ANALYZE | EARS requirements, edge cases, confidence score |
| `design.md` | DESIGN | Architecture, data flow, API contracts, error matrix |
| `tasks.md` | DESIGN | Implementation checklist, updated live during IMPLEMENT |
