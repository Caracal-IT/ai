const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ensureFile, writeFile } = require('../lib/fs');
const { readme } = require('../lib/templates');
const { getSourceCatalog } = require('./catalog');

const MANAGED_GROUPS = ['instructions', 'skills', 'agents'];
const GITIGNORE_ENTRIES = [
  '.github/instructions/',
  '.github/skills/',
  '.github/agents/',
];

function buildProjectConfig(projectName, typeKey, config = {}) {
  return JSON.stringify(
    {
      name: projectName,
      version: 2,
      type: typeKey,
      selections: config.selections || {},
      sourceRoot: '.ai',
      generatedRoot: '.github',
      instructions: ['.ai/instructions/'],
      skills: ['.ai/skills/'],
      agents: ['.ai/agents/'],
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

  const lines = new Set(existing.split(/\r?\n/));
  let updated = existing;

  for (const entry of GITIGNORE_ENTRIES) {
    if (!lines.has(entry)) {
      updated += updated.endsWith('\n') || updated.length === 0 ? '' : '\n';
      updated += `${entry}\n`;
      lines.add(entry);
    }
  }

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

async function generateProject(targetDir, projectName, typeKey, config, opts = {}) {
  const overwrite = Boolean(opts.overwrite);
  const created = [];
  const skipped = [];
  const catalog = getSourceCatalog();

  if (overwrite) {
    clearManagedAiDirectories(targetDir);
    clearManagedGithubDirectories(targetDir);
  }

  const selections = normalizeSelections(catalog, config.selections || {});

  const configRel = '.ai/project.ai.json';
  const configAbs = path.join(targetDir, configRel);
  const configContent = buildProjectConfig(projectName, typeKey, { selections });
  const configWrote = overwrite
    ? (writeFile(configAbs, configContent), true)
    : ensureFile(configAbs, configContent);
  if (configWrote) created.push(configRel);
  else skipped.push(configRel);

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

  const readmeRel = 'README.md';
  const readmeAbs = path.join(targetDir, readmeRel);
  const readmeContent = readme(projectName, typeKey, { selections });
  const readmeWrote = overwrite
    ? (writeFile(readmeAbs, readmeContent), true)
    : ensureFile(readmeAbs, readmeContent);
  if (readmeWrote) created.push(readmeRel);
  else skipped.push(readmeRel);

  if (ensureGitignore(targetDir)) {
    created.push('.gitignore');
  }

  return { created, skipped };
}

async function syncProject(targetDir) {
  const configPath = path.join(targetDir, '.ai', 'project.ai.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `No .ai/project.ai.json found in ${targetDir}. Run \"init\" first.`,
    );
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const projectName = config.name || path.basename(targetDir);
  const typeKey = config.type || 'empty';

  return generateProject(targetDir, projectName, typeKey, config, { overwrite: true });
}

module.exports = { generateProject, syncProject, normalizeSelections };
