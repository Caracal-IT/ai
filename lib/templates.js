const { PROJECT_TYPES } = require('./project-type');

/* ─────────────────────────────────────────────────────────────────────────────
   Capability / skill definitions
   ──────────────────────────────────────────────────────────────────────────── */

const CAPABILITIES = [
  { key: 'authentication',   label: 'Authentication' },
  { key: 'database-sql',     label: 'Database (SQL)' },
  { key: 'redis-cache',      label: 'Redis Cache' },
  { key: 'rest-api',         label: 'REST API standards' },
  { key: 'graphql',          label: 'GraphQL' },
  { key: 'docker',           label: 'Docker support' },
  { key: 'messaging-kafka',  label: 'Messaging (Kafka)' },
];

const SKILL_CONTENT = {
  'authentication': (stack) => `# Skill: Authentication

## Stack
${stack}

## Description
Implement secure, standards-based authentication for this project.

## Steps
1. Choose an auth mechanism appropriate for the stack (e.g. JWT, OAuth2, OIDC).
2. Store credentials securely – never in plain text or source control.
3. Enforce HTTPS for all authenticated endpoints.
4. Implement token refresh and revocation where applicable.
5. Cover auth flows with focused automated tests.
`,
  'database-sql': (stack) => `# Skill: Database (SQL)

## Stack
${stack}

## Description
Integrate a relational database following best practices for the stack.

## Steps
1. Use a connection pool appropriate for the runtime.
2. Prefer parameterised queries or an ORM; never interpolate user input into SQL.
3. Manage schema changes with a migration tool.
4. Write integration tests against a real (or containerised) database instance.
`,
  'redis-cache': (stack) => `# Skill: Redis Cache

## Stack
${stack}

## Description
Use Redis for caching, session storage, or rate-limiting.

## Steps
1. Connect via the idiomatic client for the chosen stack.
2. Set explicit TTLs on all cached keys.
3. Handle cache misses gracefully – fall through to the source of truth.
4. Test cache hit and miss paths separately.
`,
  'rest-api': (stack) => `# Skill: REST API Standards

## Stack
${stack}

## Description
Design and implement RESTful HTTP APIs that are consistent, discoverable, and versioned.

## Steps
1. Follow RFC 7231 HTTP semantics (GET is idempotent, POST creates, etc.).
2. Use problem+json (RFC 9457) for error responses.
3. Version the API through URL path (/v1/…) or Accept header.
4. Document every endpoint with OpenAPI 3.x.
5. Validate request bodies and return 400 on schema violations.
`,
  'graphql': (stack) => `# Skill: GraphQL

## Stack
${stack}

## Description
Expose a GraphQL API following schema-first design principles.

## Steps
1. Define the schema in SDL (.graphql files) before writing resolvers.
2. Use data-loaders to batch N+1 queries.
3. Enforce authorisation at the resolver level.
4. Document all types and fields with descriptions.
`,
  'docker': (stack) => `# Skill: Docker Support

## Stack
${stack}

## Description
Containerise the application for consistent, portable deployments.

## Steps
1. Write a multi-stage Dockerfile – builder stage then minimal runtime image.
2. Pin base image versions (e.g. node:22-alpine).
3. Never run the container process as root.
4. Provide a docker-compose.yml for local development with all dependencies.
5. Add a .dockerignore to exclude node_modules, .git, secrets, etc.
`,
  'messaging-kafka': (stack) => `# Skill: Messaging (Kafka)

## Stack
${stack}

## Description
Integrate with Apache Kafka for event-driven communication.

## Steps
1. Use the idiomatic Kafka client for the chosen stack.
2. Define topics, partitions, and consumer groups explicitly.
3. Implement idempotent producers and at-least-once consumer semantics.
4. Handle deserialization errors without crashing the consumer loop.
5. Test producer and consumer logic with an embedded or containerised broker.
`,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Template generators
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Return the copilot-instructions.md content for a given project type and name.
 */
function copilotInstructions(projectName, typeKey, config = {}) {
  const type = PROJECT_TYPES[typeKey] || PROJECT_TYPES.empty;
  const category    = config.category    || 'backend';
  const architecture = config.architecture || 'clean';
  const testing     = config.testing     || 'unit-integration';
  const logging     = config.logging     || 'structured';

  return `# Copilot AI System Instructions

## Project: ${projectName}
## Stack: ${type.stack}
## Category: ${category}

This repository uses a structured AI context system.

\`\`\`text
.ai/ (source of truth)
    ↓
AI CLI generator
    ↓
.github/ (Copilot consumption layer)
\`\`\`

> \`.github\` is **generated** – never edit it manually.  
> Run \`npx github:Caracal-IT/ai generate\` to rebuild it from \`.ai/\`.

---

## Architecture

**Style:** ${architecture}

Apply ${architecture} architecture patterns consistently throughout the codebase.

## Testing Strategy

**Strategy:** ${testing}

All code changes must be accompanied by tests matching the chosen strategy.

## Logging

**Strategy:** ${logging}

Use ${logging} throughout the application; never use \`console.log\` in production code.

---

## Capability Layer

| Layer | Path | Purpose |
|-------|------|---------|
| Source of truth | \`.ai/\` | Edited by humans |
| Copilot context | \`.github/\` | Generated – do not edit |
`;
}

/**
 * Return the project.ai.json content for a given project name and type.
 */
function projectConfig(projectName, typeKey, config = {}) {
  const skills = ['.ai/skills/default.md'];
  for (const cap of (config.capabilities || [])) {
    skills.push(`.ai/skills/${cap}.md`);
  }

  return JSON.stringify(
    {
      name: projectName,
      version: 1,
      type: typeKey,
      category:      config.category      || 'backend',
      architecture:  config.architecture  || 'clean',
      testing:       config.testing       || 'unit-integration',
      logging:       config.logging       || 'structured',
      registry: 'local',
      instructions: ['.ai/instructions/getting-started.md'],
      skills,
      agents: ['.ai/agents/default.json'],
    },
    null,
    2,
  ) + '\n';
}

/**
 * Return the getting-started instruction content tailored to the project type.
 */
function gettingStartedInstruction(projectName, typeKey, config = {}) {
  const type = PROJECT_TYPES[typeKey] || PROJECT_TYPES.empty;
  const architecture = config.architecture || 'clean';
  const testing      = config.testing      || 'unit-integration';
  const logging      = config.logging      || 'structured';

  return `# Getting Started – ${projectName}

## Stack
${type.stack}

## Architecture
${architecture}

## Testing
${testing}

## Logging
${logging}

## Purpose
Capture the project context here. Add reusable guidance for models and contributors.

## Key Conventions
- Follow idiomatic ${type.stack} patterns.
- Apply ${architecture} architecture principles.
- Keep code well-tested (${testing}) and documented.
- Use ${logging} throughout; never use raw console output in production.
- Expand the skills and agents as the project grows.
`;
}

/**
 * Return the default skill markdown content.
 */
function defaultSkill(projectName, typeKey) {
  const type = PROJECT_TYPES[typeKey] || PROJECT_TYPES.empty;
  return `# Default Skill – ${projectName}

## Stack
${type.stack}

## Description
Starter skill definition for reusable AI tasks.

## Steps
1. Understand the task context.
2. Apply idiomatic ${type.stack} patterns.
3. Validate with tests before marking complete.
`;
}

/**
 * Return the skill content for a specific capability key.
 */
function capabilitySkill(capabilityKey, typeKey) {
  const type = PROJECT_TYPES[typeKey] || PROJECT_TYPES.empty;
  const generator = SKILL_CONTENT[capabilityKey];
  return generator ? generator(type.stack) : `# Skill: ${capabilityKey}\n\n## Stack\n${type.stack}\n`;
}

/**
 * Return the default agent JSON content.
 */
function defaultAgent(projectName, config = {}) {
  const skills = ['.ai/skills/default.md'];
  for (const cap of (config.capabilities || [])) {
    skills.push(`.ai/skills/${cap}.md`);
  }

  return JSON.stringify(
    {
      name: 'default',
      description: `Starter agent for ${projectName}.`,
      instructions: ['.ai/instructions/getting-started.md'],
      skills,
    },
    null,
    2,
  ) + '\n';
}

/**
 * Return the README.md content for the scaffolded project.
 */
function readme(projectName, typeKey, config = {}) {
  const type = PROJECT_TYPES[typeKey] || PROJECT_TYPES.empty;
  const architecture = config.architecture || 'clean';
  const testing      = config.testing      || 'unit-integration';
  const logging      = config.logging      || 'structured';
  const caps = (config.capabilities || [])
    .map((k) => `- ${CAPABILITIES.find((c) => c.key === k)?.label || k}`)
    .join('\n') || '- None selected';

  return `# ${projectName}

## Project Overview

This project uses a structured AI context system to keep Copilot instructions,
skills, and agents organised.

**Stack:** ${type.stack}  
**Architecture:** ${architecture}  
**Testing:** ${testing}  
**Logging:** ${logging}

### AI System Architecture

\`\`\`text
.ai/ (source of truth)
    ↓
AI CLI generator
    ↓
.github/ (Copilot consumption layer)
\`\`\`

---

## AI System

| Directory | Role |
|-----------|------|
| \`.ai/\` | Source of truth – edit instructions, skills, and agents here |
| \`.github/\` | Generated Copilot context – **do not edit manually** |

---

## Enabled Capabilities

${caps}

---

## Initialization Flow

The \`init\` wizard walks through the following steps:

1. **Project detection** – auto-detects the project type from the filesystem.
2. **Project type confirmation** – Node.js, Go, Java, C#, Python, Rust, or Empty.
3. **Project category** – Backend API, Frontend App, Full-stack, CLI Tool, Library, or Microservice.
4. **Required settings:**
   - Architecture style (Clean Architecture, Layered, Modular Monolith, Microservices, Minimal)
   - Testing strategy (Unit + Integration, Unit only, Full pyramid)
   - Logging strategy (Structured, Basic, Observability)
5. **Optional capabilities** – select skills from the registry.
6. **Generation** – fetches registry, resolves skills, writes \`.ai/\`, compiles \`.github/\`.

---

## CLI Commands

\`\`\`bash
# Initialise a new AI workspace (runs the interactive wizard)
npx github:Caracal-IT/ai init

# Initialise in a specific directory
npx github:Caracal-IT/ai init ./my-project

# Regenerate .github/ from .ai/
npx github:Caracal-IT/ai generate

# Update an existing AI workspace
npx github:Caracal-IT/ai update
\`\`\`
`;
}

module.exports = {
  CAPABILITIES,
  copilotInstructions,
  projectConfig,
  gettingStartedInstruction,
  defaultSkill,
  capabilitySkill,
  defaultAgent,
  readme,
};
