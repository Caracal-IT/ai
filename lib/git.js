const { execFileSync } = require('node:child_process');

/**
 * Return the root of the git repository that contains dir,
 * or null when dir is not inside a git repo.
 */
function gitRoot(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Return true when the given directory is inside a git repository.
 */
function isGitRepo(dir) {
  return gitRoot(dir) !== null;
}

module.exports = { gitRoot, isGitRepo };
