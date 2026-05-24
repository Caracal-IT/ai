---
applyTo: "**"
---

# Getting Started – Caracal-IT/ai CLI

## Stack
Node.js / JavaScript

## Purpose
This repository is the AI CLI tool that scaffolds AI workspaces for any project.
It provides the `init`, `generate`, and `update` commands that create and maintain
`.ai/` (source of truth) and `.github/` (Copilot context) in user projects.

## Key Conventions
- Source code lives in `bin/`, `cli/`, and `lib/`.
- Skill and instruction templates for scaffolded projects live in `src/`.
- Follow Node.js CommonJS module conventions throughout.
- Every code change must include or update automated tests in `test/`.
- Run `npm test` to validate all changes before committing.
