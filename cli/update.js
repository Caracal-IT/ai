const fs = require('node:fs');
const path = require('node:path');
const { detect } = require('./detect');
const { runWizard } = require('./wizard');
const { generateProject, normalizeSelections } = require('./generate');
const { getSourceCatalog } = require('./catalog');

async function update(targetDir) {
  fs.mkdirSync(path.join(targetDir, '.ai'), { recursive: true });

  const configPath = path.join(targetDir, '.ai', 'project.ai.json');
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

  return generateProject(
    targetDir,
    projectName,
    projectType,
    { selections: wizardResult.selections },
    { overwrite: true },
  );
}

module.exports = { update };
