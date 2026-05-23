const fs = require('node:fs');
const path = require('node:path');

/**
 * Write a file only if it does not already exist.
 * Returns true when the file was created, false when it was skipped.
 */
function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

/**
 * Write a file unconditionally, creating parent directories as needed.
 */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Read a file if it exists, otherwise return null.
 */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Copy all files recursively from srcDir to destDir, only creating files
 * that do not already exist in destDir.  Returns { created, skipped }.
 */
function syncDir(srcDir, destDir) {
  const created = [];
  const skipped = [];

  if (!fs.existsSync(srcDir)) return { created, skipped };

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      const sub = syncDir(srcPath, destPath);
      created.push(...sub.created);
      skipped.push(...sub.skipped);
    } else {
      const content = fs.readFileSync(srcPath, 'utf8');
      if (ensureFile(destPath, content)) {
        created.push(destPath);
      } else {
        skipped.push(destPath);
      }
    }
  }

  return { created, skipped };
}

module.exports = { ensureFile, writeFile, readFile, syncDir };
