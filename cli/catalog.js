const fs = require('node:fs');
const path = require('node:path');

const MANAGED_GROUPS = ['instructions', 'skills', 'agents', 'prompts'];
const LEGACY_DIRS = new Set(MANAGED_GROUPS);

function toLabel(value) {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function listFilesRecursive(dirPath, prefix = '') {
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const rel = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full, rel));
    } else {
      files.push(rel);
    }
  }

  return files;
}

function filesForItem(itemDir) {
  const files = { instructions: [], skills: [], agents: [], prompts: [] };

  for (const group of MANAGED_GROUPS) {
    const groupDir = path.join(itemDir, group);
    files[group] = listFilesRecursive(groupDir);
  }

  return files;
}

function hasManagedFiles(files) {
  return MANAGED_GROUPS.some((group) => files[group].length > 0);
}

function getSourceCatalog(sourceRoot = path.resolve(__dirname, '..', 'src')) {
  const requiredDir = path.join(sourceRoot, 'required');
  const required = filesForItem(requiredDir);
  const categories = [];

  if (!fs.existsSync(sourceRoot)) {
    return { sourceRoot, required, categories };
  }

  for (const categoryEntry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!categoryEntry.isDirectory()) continue;
    if (categoryEntry.name === 'required') continue;
    if (LEGACY_DIRS.has(categoryEntry.name)) continue;

    const categoryPath = path.join(sourceRoot, categoryEntry.name);
    const items = [];

    for (const itemEntry of fs.readdirSync(categoryPath, { withFileTypes: true })) {
      if (!itemEntry.isDirectory()) continue;

      const itemPath = path.join(categoryPath, itemEntry.name);
      const files = filesForItem(itemPath);
      if (!hasManagedFiles(files)) continue;

      items.push({
        key: itemEntry.name,
        label: toLabel(itemEntry.name),
        sourceDir: itemPath,
        files,
      });
    }

    if (items.length > 0) {
      items.sort((a, b) => a.label.localeCompare(b.label));
      categories.push({
        key: categoryEntry.name,
        label: toLabel(categoryEntry.name),
        sourceDir: categoryPath,
        items,
      });
    }
  }

  categories.sort((a, b) => a.label.localeCompare(b.label));

  return {
    sourceRoot,
    required,
    categories,
  };
}

module.exports = { getSourceCatalog, toLabel };
