# Opencode System Instructions (Generator Mode)

This repository is the **opencode CLI tool** that scaffolds structured AI workspaces.
It uses `src/` as the source of truth for its own AI context and `.opencode/` as
the generated AI consumption layer.

Opencode MUST follow these rules when generating code, documentation, or
AI-related structure for this repository.

---

## 🗂 Repository Layout

```text
bin/          CLI entry point  (bin/ai.js)
cli/          Command modules  (init, detect, wizard, registry, generate, sync)
lib/          Shared utilities (fs, git, prompts, templates, project-type)
src/          Source-of-truth AI context for THIS repository
  ├── instructions/
  ├── skills/
  ├── agents/
  └── prompts/
templates/    Starter file templates copied into scaffolded projects
test/         Automated tests (run with: npm test)
```

> **Key difference from scaffolded projects:**  
> This repository uses `src/` (not `.opencode/`) as its own source of truth.  
> Scaffolded user projects use `.opencode/` as their source of truth.

---

## 🧠 Core System Behavior

The system workflow for **scaffolded projects** is:

```text
.opencode/ (source of truth)
    ↓
opencode CLI generator  (npx github:Caracal-IT/ai generate)
    ↓
.opencode/ (AI consumption layer)
```

Opencode MUST assume `.opencode` in any scaffolded project is **generated** and
never manually edited.

---

## 🚀 REQUIRED BEHAVIOR: PROJECT BOOTSTRAP GENERATION

When asked to initialize, scaffold, or explain a project that uses this CLI:

### MUST DO THE FOLLOWING

1. **Detect project type** (ask if unclear):
   - Node.js → `package.json`
   - Go → `go.mod`
   - Java → `pom.xml` / `build.gradle`
   - C# → `.sln` / `.csproj`
   - Python → `pyproject.toml` / `requirements.txt`
   - Rust → `Cargo.toml`
   - Empty Project → fallback

2. **Run the wizard** which asks:
   - Project category (Backend API, Frontend App, Full-stack, CLI Tool, Library, Microservice)
   - Architecture style (Clean Architecture, Layered, Modular Monolith, Microservices, Minimal)
   - Testing strategy (Unit + Integration, Unit only, Full pyramid)
   - Logging strategy (Structured, Basic, Observability)
   - Optional capabilities (Authentication, Database, Redis, REST, GraphQL, Docker, Kafka)

3. **Generate or update** in the target project:
   - `.opencode/agent.json`
   - `.opencode/instructions/`
   - `.opencode/skills/`
   - `.opencode/agents/`
   - `.opencode/prompts/`
   - `README.md`

---

## 📦 REQUIRED OUTPUT: README.md

Every initialization action MUST generate a complete `README.md` that includes:

1. **Project Overview** – what the project does, its architecture, AI system purpose.
2. **AI System Explanation** – `.opencode/` = source of truth and generated context.
3. **Initialization Flow** – step-by-step wizard description.
4. **CLI Commands** – documented usage of `init`, `generate`, `update`.

---

## 🖥 CLI Commands

```bash
npx github:Caracal-IT/ai init [target-directory]
npx github:Caracal-IT/ai generate [target-directory]
npx github:Caracal-IT/ai update [target-directory]
```
