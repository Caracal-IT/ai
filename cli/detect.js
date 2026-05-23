const { detectProjectType } = require('../lib/project-type');

/**
 * Detect the project type for a given directory.
 * Returns a project-type key (e.g. 'nodejs', 'go', 'empty').
 */
function detect(dir) {
  return detectProjectType(dir);
}

module.exports = { detect };
