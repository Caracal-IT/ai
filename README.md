# AI Project Generator Repository

## 1. Project Overview

This repository defines a project-generator mode for an AI CLI workflow that bootstraps AI context for software repositories.
The architecture uses a source-to-generated pipeline where `.ai/` holds canonical configuration and `.github/` is regenerated for Copilot consumption.
The AI system purpose is to standardize how initialization, scaffolding, and context generation are performed across project types.

## 2. AI System Explanation

- `.ai/` is the source of truth for project AI configuration.
- `.github/` is generated output for Copilot instructions, skills, and agents.
- The registry provides a shared skill library that can be selected during initialization.
- Local configuration provides repository-specific overrides that extend or narrow registry defaults.

## 3. Initialization Flow

The expected wizard flow is:

1. Detect the existing project and infer candidate type.
2. Confirm the project type selection (Node.js, Go, Java, C#, Python, Rust, or Unknown).
3. Select required configuration:
   - architecture style
   - testing strategy
   - logging strategy
4. Select optional capabilities:
   - authentication
   - database
   - caching
   - messaging
   - API standards
   - deployment
5. Install selected skills from registry and apply local overrides.
6. Generate `.github/skills/`, `.github/instructions/`, `.github/agents/`, and `.github/copilot-instructions.md` from `.ai/`.

## 4. CLI Commands

```bash
npx github:your-org/ai-cli init
npx github:your-org/ai-cli generate
npx github:your-org/ai-cli update
```
