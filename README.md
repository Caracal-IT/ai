# ai

`ai` is an npm-style CLI that bootstraps a structured AI workspace for any project.
It scaffolds `.ai/` as the **source of truth** and generates `.github/` as the
**Copilot consumption layer**, keeping your AI context versioned and reproducible.

## Repository Structure

```
bin/          CLI entry point
cli/          Command modules (init, detect, wizard, registry, generate, sync)
lib/          Shared utilities (fs, git, prompts, templates, project-type)
src/          Source-of-truth AI context for this CLI project itself
templates/    Starter file templates used during scaffolding
test/         Automated tests
```

## Usage

```bash
# Initialise a new AI workspace (interactive wizard)
npx github:Caracal-IT/ai init

# Initialise in a specific directory
npx github:Caracal-IT/ai init ./my-project

# Regenerate .github/ from .ai/
npx github:Caracal-IT/ai generate

# Update an existing AI workspace (alias for generate)
npx github:Caracal-IT/ai update
```

## What `init` does

1. **Detects** the project type from the filesystem (Node.js, Go, Java, C#, Python, Rust).
2. **Confirms** the detected type or lets you choose.
3. **Asks** for the project category (Backend API, Frontend App, Full-stack, CLI Tool, Library, Microservice).
4. **Configures** required settings:
   - Architecture style (Clean Architecture, Layered, Modular Monolith, Microservices, Minimal)
   - Testing strategy (Unit + Integration, Unit only, Full pyramid)
   - Logging strategy (Structured, Basic, Observability)
5. **Selects** optional capabilities from the registry (Authentication, Database, Redis, REST, GraphQL, Docker, Kafka).
6. **Generates** the project:
   - Fetches skills from the GitHub registry.
   - Writes `.ai/` (source of truth).
   - Compiles `.github/` (Copilot context).
   - Creates `README.md`.

## Generated Structure

```
<project>/
├── .ai/                          ← source of truth (edit here)
│   ├── project.ai.json
│   ├── instructions/
│   │   └── getting-started.md
│   ├── skills/
│   │   ├── default.md
│   │   └── <capability>.md       ← one per selected capability
│   └── agents/
│       └── default.json
├── .github/                      ← generated (do not edit)
│   ├── copilot-instructions.md
│   ├── instructions/
│   ├── skills/
│   └── agents/
└── README.md
```