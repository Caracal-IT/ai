# Scaffold AI Environment

## Summary

- [x] Provide an `init` command that bootstraps a structured AI workspace.
- [x] Run an interactive 5-step wizard (project type, category, architecture, testing, logging, capabilities).
- [x] Scaffold `.ai/` as the source of truth and `.github/` as the generated Copilot layer.
- [x] Resolve optional skills from the GitHub registry (with local fallback).
- [x] Generate a project-specific `README.md` and `copilot-instructions.md`.
- [x] Support a `generate`/`update` command to rebuild `.github/` from `.ai/`.
- [x] Accept an optional target directory argument.

## User Expectations

- [x] Running `npx github:Caracal-IT/ai init` starts an interactive wizard.
- [x] The wizard detects the project type and asks for confirmation.
- [x] The wizard asks for project category (Backend API, Frontend App, etc.).
- [x] The wizard asks for architecture, testing, and logging strategy.
- [x] The wizard lets the user select optional capabilities (Auth, DB, Redis, REST, GraphQL, Docker, Kafka).
- [x] Running `init` again does not overwrite files the user has already customised.
- [x] Running `generate` always regenerates `.github/` from `.ai/`.
- [x] The deprecated `setup` alias still works but prints a warning.

## Acceptance Criteria

- [x] `init [dir]` creates `.ai/project.ai.json`, `.ai/instructions/`, `.ai/skills/`, `.ai/agents/`.
- [x] `init [dir]` generates `.github/copilot-instructions.md`, `.github/instructions/`, `.github/skills/`, `.github/agents/`.
- [x] `init [dir]` generates `README.md` with project overview, AI system explanation, wizard steps, and CLI commands.
- [x] `generate [dir]` / `update [dir]` rebuilds `.github/` from `.ai/project.ai.json`.
- [x] Non-TTY mode (CI / tests) uses sensible defaults throughout the wizard.
- [x] Automated tests cover: init, idempotent re-run, generate, setup alias, unknown command.
