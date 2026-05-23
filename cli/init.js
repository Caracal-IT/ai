const path = require('node:path');
const { detect } = require('./detect');
const { runWizard } = require('./wizard');
const { generateProject } = require('./generate');

/**
 * Run the full init flow for a target directory.
 *
 * 1. Detect project type
 * 2. Run interactive wizard (or use defaults in non-TTY)
 * 3. Generate .ai/ + .github/ + README.md
 *
 * @param {string} targetDir – absolute path
 * @returns {Promise<{ created: string[], skipped: string[] }>}
 */
async function init(targetDir) {
  const detectedType = detect(targetDir);

  if (process.stdin.isTTY && detectedType !== 'empty') {
    const { PROJECT_TYPES } = require('../lib/project-type');
    console.log(`\n  Detected: ${PROJECT_TYPES[detectedType].label}`);
  }

  const wizardResult = await runWizard(detectedType);
  const { projectType, ...config } = wizardResult;
  const projectName = path.basename(targetDir);

  console.log('\n  Generating project…');
  return generateProject(targetDir, projectName, projectType, config);
}

module.exports = { init };
