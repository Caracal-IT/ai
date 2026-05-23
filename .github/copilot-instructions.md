# Copilot AI System Instructions (Project Generator Mode)

This repository uses a structured AI context system powered by `.ai/` as the source of truth and `.github/` as generated output.

Copilot MUST follow these rules when generating code, documentation, or AI-related structure.

---

## 🧠 Core System Behavior

This project uses an AI CLI system that builds structured AI context.

The system workflow is:

```text
.ai/ (source of truth)
    ↓
AI CLI generator
    ↓
.github/ (Copilot consumption layer)
```

Copilot MUST assume `.github` is generated and never manually edited.

---

## 🚀 REQUIRED BEHAVIOR: PROJECT BOOTSTRAP GENERATION

When asked to initialize, scaffold, or explain this repository:

### MUST DO THE FOLLOWING

1. Detect project type (if possible):
   - Node.js
   - Go
   - Java
   - C#
   - Python
   - Rust
   - Unknown

2. Assume an AI CLI wizard exists that performs:
   - project classification
   - required configuration selection
   - optional capability selection
   - skill installation from registry

3. Generate or update:
   - `.ai/` structure (conceptually or in code if CLI is being built)
   - `.github/skills/`
   - `.github/instructions/`
   - `.github/agents/`
   - `.github/copilot-instructions.md`

---

## 📦 REQUIRED OUTPUT: README.md

EVERY initialization or scaffolding action MUST generate a complete README.md.

The README MUST include:

### 1. Project Overview

Explain:
- what the project does
- its architecture
- AI system purpose

### 2. AI System Explanation

Explain clearly:
- `.ai/` = source of truth
- `.github/` = generated Copilot context
- registry = shared skill library
- local = project-specific overrides

### 3. Initialization Flow

Include a step-by-step wizard explanation:

- project detection
- project type selection
- required configuration:
  - architecture style
  - testing strategy
  - logging strategy
- optional capabilities selection:
  - authentication
  - database
  - caching
  - messaging
  - API standards
  - deployment

### 4. CLI Commands

Document expected CLI usage:

```bash
npx github:your-org/ai-cli init
npx github:your-org/ai-cli generate
npx github:your-org/ai-cli update
```
