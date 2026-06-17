# /refactor-plan

Sequences a multi-file refactor into safe, atomic steps with a rollback strategy for each step.

## Usage

```
/refactor-plan <description of what to refactor>
```

## What this command does

1. Reads the files involved (run `/context-map` first if you haven't).
2. Identifies the full change surface: types, callers, exports, tests.
3. Produces a sequenced plan of atomic steps where each step:
   - Can be committed and tested independently.
   - Does not break callers before they are updated.
   - Has a clear rollback path (revert the commit).
4. Flags steps that require a feature flag, a migration, or a coordination point (e.g., "deploy A before removing B").

## Output format

```
## Refactor plan: <description>

### Step 1 — <what>
Files: ...
Safe to commit alone: yes/no
Rollback: git revert <sha>
Dependency: none / requires step N first

### Step 2 — ...
```

## Sequencing rules

- Type changes before callers: update the type definition, then update each caller.
- Additions before deletions: add the new function/file, migrate callers, then delete the old one.
- Tests updated in the same commit as the code they test.
- If a step cannot be rolled back independently (e.g., a DB migration), it is flagged as a coordination point.

## After the plan is confirmed

Execute each step in order. Run tests after every step. Do not proceed to the next step if tests are red.
