const { syncProject } = require('./generate');

/**
 * Sync command: regenerate .github/ from .ai/ in targetDir.
 *
 * @param {string} targetDir – absolute path
 */
async function sync(targetDir) {
  return syncProject(targetDir);
}

module.exports = { sync };
