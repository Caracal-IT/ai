const fs = require('node:fs');
const path = require('node:path');
const { detect } = require('./detect');
const { runWizard } = require('./wizard');
const { generateProject, normalizeSelections, resolveConfigPath, listGithubFiles } = require('./generate');
const { getSourceCatalog } = require('./catalog');
const { writeFile } = require('../lib/fs');
const { createRL, confirm } = require('../lib/prompts');

async function update(targetDir) {
  fs.mkdirSync(path.join(targetDir, '.ai'), { recursive: true });

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
    { selections: wizardResult.selections, excluded: existing.excluded || [] },
    { overwrite: true },
  );

  // Find files in .github/ that are neither managed by the tool nor already
  // in the excluded list, and ask the user what to do with each one.
  const managedSet = new Set(result.managed);
  const excludedSet = new Set(result.excluded);
  const unknown = listGithubFiles(targetDir).filter(
    (f) => !managedSet.has(f) && !excludedSet.has(f),
  );

  if (unknown.length > 0) {
    const rl = createRL();
    const newExcluded = [...result.excluded];
    try {
      for (const file of unknown) {
        const shouldDelete = await confirm(rl, `Delete ${file}?`, false);
        if (shouldDelete) {
          fs.rmSync(path.join(targetDir, file), { force: true });
        } else {
          newExcluded.push(file);
        }
      }
    } finally {
      rl.close();
    }

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
