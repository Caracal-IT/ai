const fs = require('node:fs');
const path = require('node:path');
const { detect } = require('./detect');
const { runWizard } = require('./wizard');
const { generateProject } = require('./generate');
const { getSourceCatalog } = require('./catalog');

/**
 * Run the full init flow for a target directory.
 *
 * 1. Detect project type
 * 2. Run folder-driven wizard (or use defaults in non-TTY)
 * 3. Generate .ai/ first, then .github/ + README.md
 *
 * @param {string} targetDir – absolute path
 * @returns {Promise<{ created: string[], skipped: string[] }>}
 */
async function init(targetDir) {
  fs.mkdirSync(path.join(targetDir, '.ai'), { recursive: true });
  const detectedType = detect(targetDir);
  const catalog = getSourceCatalog();

  if (process.stdin.isTTY && detectedType !== 'empty') {
    const { PROJECT_TYPES } = require('../lib/project-type');
    console.log(`\n  Detected: ${PROJECT_TYPES[detectedType].label}`);
  }

  const wizardResult = await runWizard(detectedType, catalog);
  const { projectType, selections } = wizardResult;
  const projectName = path.basename(targetDir);

  console.log('\n  Generating project…');
  return generateProject(targetDir, projectName, projectType, { selections });
}

module.exports = { init };
