const { syncProject } = require('./generate');

/**
 * Sync command: regenerate .opencode/ in targetDir.
 *
 * @param {string} targetDir – absolute path
 */
async function sync(targetDir) {
  return syncProject(targetDir);
}

module.exports = { sync };
