const fs = require('node:fs');
const path = require('node:path');

const starterFiles = {
  'instructions/getting-started.md': `# Getting started

- Capture the project context here.
- Add reusable guidance for models and contributors.
- Expand the skills and agents as your environment grows.
`,
  'skills/default.json': `${JSON.stringify({
    name: 'default',
    description: 'Starter skill definition for reusable AI tasks.',
    prompt: 'Document the reusable steps this skill should perform.',
  }, null, 2)}
`,
  'agents/default.json': `${JSON.stringify({
    name: 'default',
    description: 'Starter agent wired to the default instruction and skill.',
    instructions: ['instructions/getting-started.md'],
    skills: ['skills/default.json'],
  }, null, 2)}
`,
};

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function setupEnvironment(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  const manifest = `${JSON.stringify({
    name: path.basename(targetDir),
    version: 1,
    registry: 'local',
    instructions: ['instructions/getting-started.md'],
    skills: ['skills/default.json'],
    agents: ['agents/default.json'],
  }, null, 2)}
`;

  const created = [];
  const skipped = [];

  for (const [relativePath, content] of Object.entries({
    'ai.config.json': manifest,
    ...starterFiles,
  })) {
    const fullPath = path.join(targetDir, relativePath);

    if (ensureFile(fullPath, content)) {
      created.push(relativePath);
    } else {
      skipped.push(relativePath);
    }
  }

  return {
    targetDir,
    created,
    skipped,
  };
}

module.exports = {
  setupEnvironment,
};
