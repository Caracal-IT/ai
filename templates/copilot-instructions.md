# Copilot AI System Instructions

## Project: {{projectName}}
## Stack: {{stack}}

This repository uses a structured AI context system.

```text
.ai/ (source of truth)
    ↓
AI CLI generator
    ↓
.github/ (Copilot consumption layer)
```

> `.github` is **generated** — never edit it manually.  
> Run `npx github:Caracal-IT/ai generate` to rebuild it from `.ai/`.

---

## Core Rules

- Follow idiomatic **{{stack}}** patterns.
- Apply **{{architecture}}** architecture principles.
- Write tests matching the **{{testing}}** strategy.
- Use **{{logging}}** throughout; never use raw console output in production.
