# Opencode System Instructions

## Project: {{projectName}}
## Stack: {{stack}}

This repository uses a structured AI context system.

```text
.opencode/ (source of truth)
    ↓
opencode generator
    ↓
.opencode/ (AI consumption layer)
```

> `.opencode` is **generated** — never edit it manually.  
> Run `npx opencode generate` to rebuild it.

---

## Core Rules

- Follow idiomatic **{{stack}}** patterns.
- Apply **{{architecture}}** architecture principles.
- Write tests matching the **{{testing}}** strategy.
- Use **{{logging}}** throughout; never use raw console output in production.
