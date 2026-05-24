# ai

`ai` is an npm-style CLI that bootstraps a structured AI workspace for any project.
It now reads the wizard layout directly from the repository `src/` folder and copies
selected items into `.ai/` first, then generates `.github/` from `.ai/`.

## Repository Structure

```
bin/          CLI entry point
cli/          Command modules (init, detect, wizard, generate, sync, update)
lib/          Shared utilities (fs, prompts, templates, project-type)
src/          Wizard source content (required + category/item folders)
test/         Automated tests
```

## Source Layout (`src/`)

- `src/required/` → always copied into `.ai/` and `.github/`
- `src/<category>/<item>/` → wizard sections and selectable items
- Each item can contain:
  - `instructions/**`
  - `skills/**`
  - `agents/**`

Example:

```
src/
├── required/
│   ├── instructions/
│   ├── skills/
│   └── agents/
├── capabilities/
│   ├── authentication/
│   │   └── skills/
│   └── ...
└── language/
    ├── go/
    │   └── instructions/go.best-practices.instructions.md
    └── kotlin/
        └── instructions/kotlin.best-practices.instructions.md
```

## Usage

```bash
# Initialise a new AI workspace (interactive wizard)
npx github:Caracal-IT/ai init

# Initialise in a specific directory
npx github:Caracal-IT/ai init ./my-project

# Regenerate .github/ from .ai/
npx github:Caracal-IT/ai generate

# Update selections (pre-marks installed items and recopies them)
npx github:Caracal-IT/ai update
```

## What `init` does

1. Detects project type.
2. Creates `.ai/` first.
3. Reads `src/` folder structure (no hard-coded wizard structure).
4. Prompts by category and lets users select items via checkbox controls.
5. Copies `src/required` and selected category items into `.ai/`.
6. Compiles `.github/{instructions,skills,agents}` from `.ai/`.
7. Updates `.gitignore` to ignore copied generated `.github` AI files.
8. Creates project `README.md`.

## What `update` does

1. Reads existing `.ai/project.ai.json`.
2. Opens the same category wizard with already-installed items pre-marked.
3. Re-copies all marked items, including items already copied before.
4. Rebuilds `.github/` from `.ai/`.

## Generated Structure

```
<project>/
├── .ai/                          ← source of truth used by the generator
│   ├── project.ai.json
│   ├── instructions/
│   ├── skills/
│   └── agents/
├── .github/                      ← generated Copilot context
│   ├── instructions/
│   ├── skills/                   ← each skill is generated as <name>/SKILL.md
│   └── agents/
├── .gitignore                    ← includes .github AI generated paths
└── README.md
```

## Adding a custom AI item

1. Create a category (or reuse one): `src/<category>/`
2. Create a selectable item folder: `src/<category>/<item>/`
3. Add files under any of:
   - `src/<category>/<item>/instructions/`
   - `src/<category>/<item>/skills/`
   - `src/<category>/<item>/agents/`
4. Run `npx github:Caracal-IT/ai update` in your target project and select the item.

The wizard section and labels are derived from folder names automatically.
