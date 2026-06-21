const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ensureFile, writeFile } = require('../lib/fs');
const { readme } = require('../lib/templates');
const { getSourceCatalog } = require('./catalog');

const MANAGED_GROUPS = ['instructions', 'skills', 'agents', 'prompts'];
const MANAGED_GROUP_ROOTS = new Set(MANAGED_GROUPS.map((group) => path.posix.join('.opencode', group)));

// Config lives at the project root; fall back to the legacy .ai/ location.
const CONFIG_REL = 'project.ai.json';
const LEGACY_CONFIG_REL = path.join('.ai', 'project.ai.json');

// These entries were previously added to .gitignore to hide generated files.
// We now want every .opencode/ file to be source-controlled, so we actively
// remove them when encountered.
const GITIGNORE_ENTRIES_TO_REMOVE = [
  '.opencode/instructions/',
  '.opencode/skills/',
  '.opencode/agents/',
  '.opencode/prompts/',
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
      sourceRoot: '.opencode',
      generatedRoot: '.opencode',
      instructions: ['.opencode/instructions/'],
      skills: ['.opencode/skills/'],
      agents: ['.opencode/agents/'],
      prompts: ['.opencode/prompts/'],
      excluded: config.excluded || [],
      managed: config.managed || [],
    },
    null,
    2,
  ) + '\n';
}

function toPosixPath(relPath) {
  return relPath.split(path.sep).join('/');
}

function normalizeTrackedPath(relPath) {
  return toPosixPath(relPath).replace(/\/+$/, '');
}

function matchesTrackedEntry(relPath, entries = []) {
  const normalizedPath = normalizeTrackedPath(relPath);

  return entries.some((entry) => {
    const normalizedEntry = normalizeTrackedPath(entry);
    return normalizedEntry.length > 0
      && (normalizedPath === normalizedEntry || normalizedPath.startsWith(`${normalizedEntry}/`));
  });
}

function addTrackedPath(entries, relPath) {
  const normalizedPath = normalizeTrackedPath(relPath);
  if (!normalizedPath) return;

  entries.add(normalizedPath);

  let currentDir = path.posix.dirname(normalizedPath);
  while (currentDir && currentDir !== '.' && currentDir !== '.opencode') {
    if (!MANAGED_GROUP_ROOTS.has(currentDir)) {
      entries.add(`${currentDir}/`);
    }
    currentDir = path.posix.dirname(currentDir);
  }
}

function compactTrackedEntries(entries = []) {
  const sorted = [...new Set(entries.map((entry) => toPosixPath(entry)))].sort();
  const compacted = [];

  for (const entry of sorted) {
    if (matchesTrackedEntry(entry, compacted)) continue;
    compacted.push(entry);
  }

  return compacted;
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

  // Remove previously-managed directory ignore entries so that all .opencode/
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

function opencodeTargetRelFor(group, relFile) {
  if (group === 'skills' && relFile.toLowerCase().endsWith('.md')) {
    const basename = path.posix.basename(relFile).toLowerCase();
    if (basename === 'skill.md') {
      // Already in folder-based format: keep path as-is
      return path.posix.join('.opencode', group, relFile);
    }
    if (!relFile.includes('/')) {
      // Flat legacy format (e.g. my-skill.md) → my-skill/SKILL.md
      const parsed = path.posix.parse(relFile);
      return path.posix.join('.opencode', group, parsed.name, 'SKILL.md');
    }
    // Supporting file inside a skill folder (e.g. templates/…), copy as-is
    return path.posix.join('.opencode', group, relFile);
  }

  return path.posix.join('.opencode', group, relFile);
}

function copyItemToOpencode(targetDir, sourceDir, files, overwrite, created, skipped, excluded = []) {
  const copied = [];
  for (const group of MANAGED_GROUPS) {
    for (const relFile of files[group]) {
      const content = fs.readFileSync(path.join(sourceDir, group, relFile), 'utf8');
      const targetRel = opencodeTargetRelFor(group, relFile);
      if (matchesTrackedEntry(targetRel, excluded)) {
        skipped.push(targetRel);
        continue;
      }
      const targetAbs = path.join(targetDir, targetRel);
      let wrote;
      if (overwrite) {
        writeFile(targetAbs, content);
        wrote = true;
      } else {
        wrote = ensureFile(targetAbs, content);
      }

      if (wrote) created.push(targetRel);
      else skipped.push(targetRel);
      copied.push(targetRel);
    }
  }
  return copied;
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

function clearManagedOpencodeDirectories(targetDir, previouslyManaged = [], excluded = []) {
  const insideGitRepo = isGitRepository(targetDir);

  for (const group of MANAGED_GROUPS) {
    const groupDir = path.join(targetDir, '.opencode', group);
    if (!fs.existsSync(groupDir)) continue;

    const files = listFilesRecursive(groupDir);
    for (const relFile of files) {
      const relPath = path.posix.join('.opencode', group, relFile);
      if (matchesTrackedEntry(relPath, excluded)) continue;
      // Always remove files that were previously managed by this tool, even if
      // they have since been committed to git. Only preserve git-tracked files
      // that the tool did not create (user-owned files).
      if (
        insideGitRepo
        && !matchesTrackedEntry(relPath, previouslyManaged)
        && isGitTrackedFile(targetDir, relPath)
      ) continue;
      fs.rmSync(path.join(groupDir, relFile), { force: true });
    }

    removeEmptyDirectories(groupDir);
  }
}

/**
 * List every file currently in the .opencode/ directory tree (relative to targetDir).
 * Returns posix-style paths like ".opencode/copilot-instructions.md".
 */
function listOpencodeFiles(targetDir) {
  const opencodeDir = path.join(targetDir, '.opencode');
  if (!fs.existsSync(opencodeDir)) return [];
  return listFilesRecursive(opencodeDir).map((f) => path.posix.join('.opencode', f));
}

async function generateProject(targetDir, projectName, typeKey, config, opts = {}) {
  const overwrite = Boolean(opts.overwrite);
  const created = [];
  const skipped = [];
  const catalog = getSourceCatalog();

  // Carry forward any files the user has already excluded from management.
  const excludedSet = new Set(
    Array.isArray(config.excluded) ? config.excluded.map((entry) => toPosixPath(entry)) : [],
  );

  // Files previously owned by this tool — used to safely remove them on
  // overwrite even when they have been committed to git.
  const previouslyManaged = Array.isArray(config.managed)
    ? config.managed.map((entry) => toPosixPath(entry))
    : [];

  // On the very first init (no overwrite, no existing config) record every
  // file already present in .opencode/ so we never touch them automatically.
  const isFirstInit = !overwrite && !fs.existsSync(resolveConfigPath(targetDir));
  if (isFirstInit) {
    const preExisting = listOpencodeFiles(targetDir);
    for (const f of preExisting) {
      addTrackedPath(excludedSet, f);
    }
  }

  if (overwrite) {
    clearManagedOpencodeDirectories(targetDir, previouslyManaged, [...excludedSet]);
  }

  const selections = normalizeSelections(catalog, config.selections || {});

  // Write config to the project root (not inside .ai/).
  const configAbs = path.join(targetDir, CONFIG_REL);
  // Placeholder config first; we will rewrite it at the end with the
  // accurate `managed` list.
  const configContent = buildProjectConfig(projectName, typeKey, {
    selections,
    excluded: [...excludedSet].sort(),
    managed: [],
  });
  let configWrote;
  if (overwrite) {
    writeFile(configAbs, configContent);
    configWrote = true;
  } else {
    configWrote = ensureFile(configAbs, configContent);
  }
  if (configWrote) created.push(CONFIG_REL);
  else skipped.push(CONFIG_REL);

  const requiredDir = path.join(catalog.sourceRoot, 'required');
  const managedSet = new Set();
  for (const copied of copyItemToOpencode(
    targetDir,
    requiredDir,
    catalog.required,
    overwrite,
    created,
    skipped,
    [...excludedSet],
  )) {
    addTrackedPath(managedSet, copied);
  }

  for (const category of catalog.categories) {
    const selected = new Set(selections[category.key] || []);
    for (const item of category.items) {
      if (!selected.has(item.key)) continue;
      for (const copied of copyItemToOpencode(
        targetDir,
        item.sourceDir,
        item.files,
        overwrite,
        created,
        skipped,
        [...excludedSet],
      )) {
        addTrackedPath(managedSet, copied);
      }
    }
  }
  const excluded = compactTrackedEntries([...excludedSet]);
  const managed = compactTrackedEntries([...managedSet]);

  // Persist the config with the accurate excluded + managed lists.
  writeFile(configAbs, buildProjectConfig(projectName, typeKey, { selections, excluded, managed }));

  const readmeRel = 'README.md';
  const readmeAbs = path.join(targetDir, readmeRel);
  const readmeContent = readme(projectName, typeKey, { selections });
  let readmeWrote;
  if (overwrite) {
    writeFile(readmeAbs, readmeContent);
    readmeWrote = true;
  } else {
    readmeWrote = ensureFile(readmeAbs, readmeContent);
  }
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

module.exports = {
  addTrackedPath,
  generateProject,
  opencodeTargetRelFor,
  listOpencodeFiles,
  matchesTrackedEntry,
  normalizeSelections,
  compactTrackedEntries,
  resolveConfigPath,
  syncProject,
};
