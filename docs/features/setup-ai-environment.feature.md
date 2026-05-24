# Scaffold AI Environment

## Summary

- [x] Provide an `init` command that bootstraps a structured AI workspace.
- [x] Remove hard-coded architecture/testing/logging wizard steps.
- [x] Drive wizard sections from `src/<category>/<item>/` folder structure.
- [x] Add `src/required/` that is always installed.
- [x] Copy selected item files (`instructions`, `skills`, `agents`) into `.github/`.
- [x] Keep pre-existing `.github/` files untouched on init (record them as `excluded`).
- [x] Add `src/language/go/instructions/go.best-practices.instructions.md`.
- [x] Add `src/language/kotlin/instructions/kotlin.best-practices.instructions.md`.
- [x] Keep `generate` and add interactive `update` with pre-marked installed items.
- [x] Add a required `feature-documentation` skill with a `.feature.md` demo template.
- [x] Place `project.ai.json` at the project root (not inside `.ai/`).
- [x] Track `excluded` (pre-existing / user-kept `.github/` files) and `managed` (tool-owned) lists in `project.ai.json`.
- [x] Remove `.github/{instructions,skills,agents}/` from `.gitignore` so all `.github/` files are source-controlled.
- [x] During `update`: prompt about unknown `.github/` files — delete or add to `excluded`.

## User Expectations

- [x] Running `npx github:Caracal-IT/ai init` starts an interactive wizard.
- [x] The wizard detects project type and allows confirmation/change.
- [x] The wizard shows category sections using folder names from `src/`.
- [x] The wizard shows selectable sub-folder items with checkbox selection (spacebar/pointer).
- [x] `init` generates `.github/` directly from selected `src/` items.
- [x] `src/required` content is always installed.
- [x] Running `update` pre-marks installed items and recopies marked selections.
- [x] Files already in `.github/` when `init` runs are recorded as `excluded` and never modified.
- [x] All `.github/` files are source-controlled (not in `.gitignore`).
- [x] `update` asks about unknown `.github/` files and adds them to `excluded` if the user says no to deletion.
- [x] `project.ai.json` lives at the project root for easy discovery.
- [x] The generated workspace includes a required feature-documentation skill for `docs/.../*.feature.md` files.

## Acceptance Criteria

- [x] `init [dir]` creates `project.ai.json` at the project root with `excluded`, `managed`, `version: 3`.
- [x] `init [dir]` does not create a `.ai/` folder.
- [x] `init [dir]` generates `.github/instructions/`, `.github/skills/`, `.github/agents/` from `src/` selections.
- [x] `init [dir]` records pre-existing `.github/` files in `excluded` (does not modify them).
- [x] `init [dir]` records generated `.github/` files in `managed`.
- [x] `init [dir]` removes `.github/{instructions,skills,agents}/` ignore lines from `.gitignore` if present.
- [x] Backward-compat: `generate [dir]` falls back to `.ai/project.ai.json` when no root config exists.
- [x] Wizard structure is read from filesystem and not hard-coded.
- [x] `update [dir]` pre-selects installed items and re-copies all marked items.
- [x] `update [dir]` prompts about `.github/` files not in `managed` or `excluded`; deletes on yes, adds to `excluded` on no.
- [x] `generate [dir]` still rebuilds `.github/` from the config.
- [x] Automated tests cover init, idempotent re-run, generate, update behavior, excluded/managed tracking, gitignore migration, backward compat, setup alias, unknown command.
- [x] The required feature-documentation skill tells users to confirm understanding, ask for category/sub-category when needed, save docs as `.feature.md` files under `docs/`, allow the user to review and modify the document, and ask whether code implementation should proceed.
