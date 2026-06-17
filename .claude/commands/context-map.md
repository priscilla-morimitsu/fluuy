# /context-map

Maps the dependencies of a file or feature before a change, so you understand the blast radius and can sequence the work safely.

## Usage

```
/context-map <file or feature>
```

## What this command does

1. Reads the target file(s).
2. Identifies all imports and callers (who depends on this file).
3. Identifies all dependencies (what this file depends on).
4. Flags: shared types, Server Actions, public API surfaces, and files likely to need changes if the target changes.
5. Produces a dependency map with the following structure:

```
## Context map: <target>

### Callers (files that import this)
- path/to/caller.ts — uses: FunctionA, TypeB

### Dependencies (what this imports)
- path/to/dep.ts — uses: UtilX

### Shared contracts (types / interfaces used by multiple callers)
- TypeB in types/foo.ts — changing this affects N callers

### Likely change surface
- Files that will probably need updates: ...
- Files to watch for regressions: ...
```

## When to use

- Before a refactor that touches a shared utility, a type, or a Server Action.
- Before splitting or merging modules.
- Before a rename that crosses file boundaries.

Run `/refactor-plan` after the context map to sequence the actual changes.
