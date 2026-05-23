# ai

`ai` is a small npm-style CLI that bootstraps an AI workspace with starter
instructions, skills, and agents in a single command.

## Usage

```bash
npx github:Caracal-IT/ai setup
```

The setup command creates:

- `ai.config.json`
- `instructions/getting-started.md`
- `skills/default.json`
- `agents/default.json`

You can also target a different directory:

```bash
npx github:Caracal-IT/ai setup ./my-project
```