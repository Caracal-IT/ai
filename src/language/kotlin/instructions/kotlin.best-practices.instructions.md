---
name: "kotlin-best-practices"
description: "Kotlin coding and testing standards for this repository."
applyTo: "**/*.kt,**/*.kts"
---

# Kotlin Best Practices

## Code Quality
- Keep classes and functions focused and small; avoid unnecessary coupling.
- Prefer explicit interfaces where they improve testability.
- Return errors with enough context for debugging.

## Testing Requirements
- Add comprehensive automated tests for all new logic.
- Ensure all tests pass before merging changes.
- Add benchmarks for performance-sensitive paths.

## Documentation Requirements
- Add KDoc comments for public classes, functions, and properties.
- Keep examples aligned with real usage and test coverage.
