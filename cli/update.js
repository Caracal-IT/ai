const fs = require('node:fs');
const path = require('node:path');
const { detect } = require('./detect');
const { runWizard } = require('./wizard');
const {
  addTrackedPath,
  generateProject,
  listGithubFiles,
  matchesTrackedEntry,
  normalizeSelections,
  resolveConfigPath,
} = require('./generate');
const { getSourceCatalog } = require('./catalog');
const { writeFile } = require('../lib/fs');

async function update(targetDir) {
  const configPath = resolveConfigPath(targetDir);
  let existing = {};
  if (fs.existsSync(configPath)) {
    existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const catalog = getSourceCatalog();
  const detectedType = existing.type || detect(targetDir);
  const defaults = {
    selections: normalizeSelections(catalog, existing.selections || {}),
  };

  const wizardResult = await runWizard(detectedType, catalog, defaults);
  const projectType = wizardResult.projectType || detectedType;
  const projectName = existing.name || path.basename(targetDir);

  const result = await generateProject(
    targetDir,
    projectName,
    projectType,
    { selections: wizardResult.selections, excluded: existing.excluded || [], managed: existing.managed || [] },
    { overwrite: true },
  );

  // Find files in .github/ that are neither managed by the tool nor already
  // in the excluded list, and automatically add them to the excluded list so
  // they are preserved on future updates.
  const managedEntries = result.managed;
  const excludedEntries = result.excluded;
  const unknown = listGithubFiles(targetDir).filter(
    (f) => !matchesTrackedEntry(f, managedEntries) && !matchesTrackedEntry(f, excludedEntries),
  );

  if (unknown.length > 0) {
    const newExcludedSet = new Set(result.excluded);
    for (const file of unknown) {
      if (matchesTrackedEntry(file, [...newExcludedSet])) continue;
      addTrackedPath(newExcludedSet, file);
    }

    const newExcluded = [...newExcludedSet].sort();
    if (newExcluded.length !== result.excluded.length) {
      // Persist the updated excluded list.
      const rootConfigPath = path.join(targetDir, 'project.ai.json');
      const config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
      config.excluded = newExcluded;
      writeFile(rootConfigPath, `${JSON.stringify(config, null, 2)}\n`);
      result.excluded = newExcluded;
    }
  }

  return result;
}

module.exports = { update };
