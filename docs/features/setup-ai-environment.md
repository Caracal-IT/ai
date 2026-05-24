# Scaffold AI Environment

## Summary

- [x] Provide an `init` command that bootstraps a structured AI workspace.
- [x] Remove hard-coded architecture/testing/logging wizard steps.
- [x] Drive wizard sections from `src/<category>/<item>/` folder structure.
- [x] Add `src/required/` that is always installed.
- [x] Copy selected item files (`instructions`, `skills`, `agents`) into `.ai/` and `.github/`.
- [x] Keep `.github/` source-controlled files untouched on non-overwrite init.
- [x] Add `src/language/go/instructions/go.best-practices.instructions.md`.
- [x] Add `src/language/kotlin/instructions/kotlin.best-practices.instructions.md`.
- [x] Keep `generate` and add interactive `update` with pre-marked installed items.

## User Expectations

- [x] Running `npx github:Caracal-IT/ai init` starts an interactive wizard.
- [x] The wizard detects project type and allows confirmation/change.
- [x] The wizard shows category sections using folder names from `src/`.
- [x] The wizard shows selectable sub-folder items with checkbox selection (spacebar/pointer).
- [x] `.ai/` is created first and used as source before `.github/` compilation.
- [x] `src/required` content is always installed.
- [x] Running `update` pre-marks installed items and recopies marked selections.
- [x] Generated `.github/{instructions,skills,agents}` AI files are ignored via `.gitignore`.

## Acceptance Criteria

- [x] `init [dir]` creates `.ai/project.ai.json`, `.ai/instructions/`, `.ai/skills/`, `.ai/agents/`.
- [x] `init [dir]` generates `.github/instructions/`, `.github/skills/`, `.github/agents/` from `.ai/`.
- [x] `init [dir]` writes `.gitignore` entries for generated `.github` AI files.
- [x] Wizard structure is read from filesystem and not hard-coded.
- [x] `update [dir]` pre-selects installed items and re-copies all marked items.
- [x] `generate [dir]` still rebuilds `.github/` from `.ai/project.ai.json`.
- [x] Automated tests cover init, idempotent re-run, generate, update behavior, setup alias, unknown command.
