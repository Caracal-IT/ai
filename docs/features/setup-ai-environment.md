# Setup AI environment

## Summary

- [x] Provide a single command to initialize an AI workspace.
- [x] Scaffold starter instructions, skills, and agents.
- [x] Generate a local manifest so the workspace behaves like a small npm-style package.

## User Expectations

- [x] A user can run one setup command and get a working AI workspace structure.
- [x] The generated workspace includes starter content for instructions, skills, and agents.
- [x] Running setup again does not overwrite files the user already customized.

## Acceptance Criteria

- [x] The repository exposes an `ai setup [target-directory]` CLI entrypoint.
- [x] Setup creates `ai.config.json` plus `instructions`, `skills`, and `agents` starter files.
- [x] Focused automated tests verify creation and idempotent re-runs.
