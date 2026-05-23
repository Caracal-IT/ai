const path = require('node:path');
const { ensureFile, writeFile } = require('../lib/fs');
const {
  copilotInstructions,
  projectConfig,
  gettingStartedInstruction,
  defaultSkill,
  capabilitySkill,
  defaultAgent,
  readme,
} = require('../lib/templates');
const { resolveSkills } = require('./registry');

/**
 * Write the full `.ai/` source-of-truth structure and compile `.github/`.
 *
 * @param {string} targetDir  – absolute path to the project root
 * @param {string} projectName
 * @param {string} typeKey    – project type (e.g. 'nodejs')
 * @param {object} config     – { category, architecture, testing, logging, capabilities[] }
 * @param {object} [opts]     – { overwrite: boolean }
 * @returns {{ created: string[], skipped: string[] }}
 */
async function generateProject(targetDir, projectName, typeKey, config, opts = {}) {
  const write = opts.overwrite ? writeFile : ensureFile;
  const created = [];
  const skipped = [];

  function put(relPath, content) {
    const full = path.join(targetDir, relPath);
    const wrote = opts.overwrite
      ? (writeFile(full, content), true)
      : ensureFile(full, content);
    if (wrote) created.push(relPath);
    else skipped.push(relPath);
  }

  /* ── Step 1: Resolve capability skills from registry ─────────────────── */
  console.log('  → Fetching registry skills…');
  const resolvedSkills = await resolveSkills(
    config.capabilities || [],
    typeKey,
    capabilitySkill,
  );

  /* ── Step 2: Write .ai/ (source of truth) ────────────────────────────── */
  put('.ai/project.ai.json',                    projectConfig(projectName, typeKey, config));
  put('.ai/instructions/getting-started.md',    gettingStartedInstruction(projectName, typeKey, config));
  put('.ai/skills/default.md',                  defaultSkill(projectName, typeKey));
  put('.ai/agents/default.json',                defaultAgent(projectName, config));

  for (const [capKey, content] of resolvedSkills) {
    put(`.ai/skills/${capKey}.md`, content);
  }

  /* ── Step 3: Compile .github/ ────────────────────────────────────────── */
  put('.github/copilot-instructions.md',        copilotInstructions(projectName, typeKey, config));
  put('.github/instructions/getting-started.md', gettingStartedInstruction(projectName, typeKey, config));
  put('.github/skills/default.md',              defaultSkill(projectName, typeKey));
  put('.github/agents/default.json',            defaultAgent(projectName, config));

  for (const [capKey, content] of resolvedSkills) {
    put(`.github/skills/${capKey}.md`, content);
  }

  /* ── Step 4: README ──────────────────────────────────────────────────── */
  put('README.md', readme(projectName, typeKey, config));

  return { created, skipped };
}

/**
 * Sync an existing project: regenerate `.github/` from `.ai/`.
 * Reads project.ai.json from `.ai/` and re-compiles `.github/`.
 *
 * @param {string} targetDir
 * @returns {Promise<{ created: string[], skipped: string[] }>}
 */
async function syncProject(targetDir) {
  const fs = require('node:fs');
  const configPath = path.join(targetDir, '.ai', 'project.ai.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `No .ai/project.ai.json found in ${targetDir}. Run "init" first.`,
    );
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const projectName = config.name || path.basename(targetDir);
  const typeKey = config.type || 'empty';

  return generateProject(targetDir, projectName, typeKey, config, { overwrite: true });
}

module.exports = { generateProject, syncProject };
