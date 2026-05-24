const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ensureFile, writeFile } = require('../lib/fs');
const { readme } = require('../lib/templates');
const { getSourceCatalog } = require('./catalog');

const MANAGED_GROUPS = ['instructions', 'skills', 'agents'];

// Config lives at the project root; fall back to the legacy .ai/ location.
const CONFIG_REL = 'project.ai.json';
const LEGACY_CONFIG_REL = path.join('.ai', 'project.ai.json');

// These entries were previously added to .gitignore to hide generated files.
// We now want every .github/ file to be source-controlled, so we actively
// remove them when encountered.
const GITIGNORE_ENTRIES_TO_REMOVE = [
  '.github/instructions/',
  '.github/skills/',
  '.github/agents/',
];

/**
 * Resolve the path to project.ai.json.
 * Prefers the root location; falls back to the legacy .ai/ location so that
 * existing projects continue to work until they run `update`.
 */
function resolveConfigPath(targetDir) {
  const rootPath = path.join(targetDir, CONFIG_REL);
  if (fs.existsSync(rootPath)) return rootPath;
  const legacyPath = path.join(targetDir, LEGACY_CONFIG_REL);
  if (fs.existsSync(legacyPath)) return legacyPath;
  return rootPath;
}

function buildProjectConfig(projectName, typeKey, config = {}) {
  return JSON.stringify(
    {
      name: projectName,
      version: 3,
      type: typeKey,
      selections: config.selections || {},
      sourceRoot: '.ai',
      generatedRoot: '.github',
      instructions: ['.ai/instructions/'],
      skills: ['.ai/skills/'],
      agents: ['.ai/agents/'],
      excluded: config.excluded || [],
      managed: config.managed || [],
    },
    null,
    2,
  ) + '\n';
}

function listFilesRecursive(dirPath, prefix = '') {
  const files = [];
  if (!fs.existsSync(dirPath)) return files;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    const rel = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full, rel));
    } else {
      files.push(rel);
    }
  }

  return files;
}

function ensureGitignore(targetDir) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8')
    : '';

  // Remove previously-managed directory ignore entries so that all .github/
  // files are source-controlled going forward.
  const lines = existing.split(/\r?\n/);
  const filtered = lines.filter((line) => !GITIGNORE_ENTRIES_TO_REMOVE.includes(line));

  // Trim trailing blank lines introduced by the removal.
  while (filtered.length > 0 && filtered[filtered.length - 1] === '') {
    filtered.pop();
  }
  const updated = filtered.length > 0 ? `${filtered.join('\n')}\n` : '';

  if (updated !== existing) {
    writeFile(gitignorePath, updated);
    return true;
  }

  return false;
}

function normalizeSelections(catalog, inputSelections = {}) {
  const normalized = {};

  for (const category of catalog.categories) {
    const valid = new Set(category.items.map((item) => item.key));
    const selected = inputSelections[category.key] || [];
    normalized[category.key] = selected.filter((key) => valid.has(key));
  }

  return normalized;
}

function copyGroupFiles({ targetDir, srcRoot, destinationRoot, group, files, overwrite, created, skipped }) {
  for (const relFile of files) {
    const content = fs.readFileSync(path.join(srcRoot, group, relFile), 'utf8');
    const targetRel = path.posix.join(destinationRoot, group, relFile);
    const targetAbs = path.join(targetDir, targetRel);
    const wrote = overwrite
      ? (writeFile(targetAbs, content), true)
      : ensureFile(targetAbs, content);

    if (wrote) created.push(targetRel);
    else skipped.push(targetRel);
  }
}

function copyItemToAi(targetDir, sourceDir, files, overwrite, created, skipped) {
  for (const group of MANAGED_GROUPS) {
    copyGroupFiles({
      targetDir,
      srcRoot: sourceDir,
      destinationRoot: '.ai',
      group,
      files: files[group],
      overwrite,
      created,
      skipped,
    });
  }
}

function copyAiToGithub(targetDir, overwrite, created, skipped) {
  for (const group of MANAGED_GROUPS) {
    const aiGroupDir = path.join(targetDir, '.ai', group);
    const files = listFilesRecursive(aiGroupDir);
    for (const relFile of files) {
      const content = fs.readFileSync(path.join(aiGroupDir, relFile), 'utf8');
      let targetRel;
      if (group === 'skills' && relFile.toLowerCase().endsWith('.md')) {
        const basename = path.posix.basename(relFile).toLowerCase();
        if (basename === 'skill.md') {
          // Already in folder-based format: keep path as-is
          targetRel = path.posix.join('.github', group, relFile);
        } else if (!relFile.includes('/')) {
          // Flat legacy format (e.g. my-skill.md) → my-skill/SKILL.md
          const parsed = path.posix.parse(relFile);
          targetRel = path.posix.join('.github', group, parsed.name, 'SKILL.md');
        } else {
          // Supporting file inside a skill folder (e.g. templates/…), copy as-is
          targetRel = path.posix.join('.github', group, relFile);
        }
      } else {
        targetRel = path.posix.join('.github', group, relFile);
      }
      const targetAbs = path.join(targetDir, targetRel);
      const wrote = overwrite
        ? (writeFile(targetAbs, content), true)
        : ensureFile(targetAbs, content);

      if (wrote) created.push(targetRel);
      else skipped.push(targetRel);
    }
  }
}

function isGitRepository(targetDir) {
  try {
    const output = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output === 'true';
  } catch {
    return false;
  }
}

function isGitTrackedFile(targetDir, relPath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relPath], {
      cwd: targetDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function removeEmptyDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    removeEmptyDirectories(path.join(dirPath, entry.name));
  }

  if (fs.readdirSync(dirPath).length === 0) {
    fs.rmdirSync(dirPath);
  }
}

function clearManagedAiDirectories(targetDir) {
  for (const group of MANAGED_GROUPS) {
    fs.rmSync(path.join(targetDir, '.ai', group), { recursive: true, force: true });
  }
}

function clearManagedGithubDirectories(targetDir) {
  const insideGitRepo = isGitRepository(targetDir);

  for (const group of MANAGED_GROUPS) {
    const groupDir = path.join(targetDir, '.github', group);
    if (!fs.existsSync(groupDir)) continue;

    if (!insideGitRepo) {
      fs.rmSync(groupDir, { recursive: true, force: true });
      continue;
    }

    const files = listFilesRecursive(groupDir);
    for (const relFile of files) {
      const relPath = path.posix.join('.github', group, relFile);
      if (isGitTrackedFile(targetDir, relPath)) continue;
      fs.rmSync(path.join(groupDir, relFile), { force: true });
    }

    removeEmptyDirectories(groupDir);
  }
}

/**
 * List every file currently in the .github/ directory tree (relative to targetDir).
 * Returns posix-style paths like ".github/copilot-instructions.md".
 */
function listGithubFiles(targetDir) {
  const githubDir = path.join(targetDir, '.github');
  if (!fs.existsSync(githubDir)) return [];
  return listFilesRecursive(githubDir).map((f) => path.posix.join('.github', f));
}

async function generateProject(targetDir, projectName, typeKey, config, opts = {}) {
  const overwrite = Boolean(opts.overwrite);
  const created = [];
  const skipped = [];
  const catalog = getSourceCatalog();

  // Carry forward any files the user has already excluded from management.
  const excluded = Array.isArray(config.excluded) ? [...config.excluded] : [];

  // On the very first init (no overwrite, no existing config) record every
  // file already present in .github/ so we never touch them automatically.
  const isFirstInit = !overwrite && !fs.existsSync(resolveConfigPath(targetDir));
  if (isFirstInit) {
    const preExisting = listGithubFiles(targetDir);
    for (const f of preExisting) {
      if (!excluded.includes(f)) excluded.push(f);
    }
  }

  if (overwrite) {
    clearManagedAiDirectories(targetDir);
    clearManagedGithubDirectories(targetDir);
  }

  const selections = normalizeSelections(catalog, config.selections || {});

  // Write config to the project root (not inside .ai/).
  const configAbs = path.join(targetDir, CONFIG_REL);
  // Placeholder config first; we will rewrite it at the end with the
  // accurate `managed` list.
  const configContent = buildProjectConfig(projectName, typeKey, { selections, excluded, managed: [] });
  const configWrote = overwrite
    ? (writeFile(configAbs, configContent), true)
    : ensureFile(configAbs, configContent);
  if (configWrote) created.push(CONFIG_REL);
  else skipped.push(CONFIG_REL);

  const requiredDir = path.join(catalog.sourceRoot, 'required');
  copyItemToAi(targetDir, requiredDir, catalog.required, overwrite, created, skipped);

  for (const category of catalog.categories) {
    const selected = new Set(selections[category.key] || []);
    for (const item of category.items) {
      if (!selected.has(item.key)) continue;
      copyItemToAi(targetDir, item.sourceDir, item.files, overwrite, created, skipped);
    }
  }

  copyAiToGithub(targetDir, overwrite, created, skipped);

  // Build the authoritative managed list from what is now in the managed
  // group directories under .github/.
  const managed = [];
  for (const group of MANAGED_GROUPS) {
    const groupDir = path.join(targetDir, '.github', group);
    for (const f of listFilesRecursive(groupDir)) {
      managed.push(path.posix.join('.github', group, f));
    }
  }

  // Persist the config with the accurate excluded + managed lists.
  writeFile(configAbs, buildProjectConfig(projectName, typeKey, { selections, excluded, managed }));

  const readmeRel = 'README.md';
  const readmeAbs = path.join(targetDir, readmeRel);
  const readmeContent = readme(projectName, typeKey, { selections });
  const readmeWrote = overwrite
    ? (writeFile(readmeAbs, readmeContent), true)
    : ensureFile(readmeAbs, readmeContent);
  if (readmeWrote) created.push(readmeRel);
  else skipped.push(readmeRel);

  ensureGitignore(targetDir);

  return { created, skipped, excluded, managed };
}

async function syncProject(targetDir) {
  const configPath = resolveConfigPath(targetDir);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `No project.ai.json found in ${targetDir}. Run "init" first.`,
    );
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const projectName = config.name || path.basename(targetDir);
  const typeKey = config.type || 'empty';

  return generateProject(targetDir, projectName, typeKey, config, { overwrite: true });
}

module.exports = { generateProject, syncProject, normalizeSelections, resolveConfigPath, listGithubFiles };
