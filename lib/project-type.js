const fs = require('node:fs');
const path = require('node:path');

/**
 * Supported project types and their detection heuristics.
 * Each entry provides:
 *   - label      Human-readable name shown in the wizard
 *   - detect(dir) Returns true when this type is recognised in dir
 *   - stack      Short tech-stack description used in generated files
 */
const PROJECT_TYPES = {
  nodejs: {
    label: 'Node.js',
    stack: 'Node.js / JavaScript',
    detect(dir) {
      return fs.existsSync(path.join(dir, 'package.json'));
    },
  },
  go: {
    label: 'Go',
    stack: 'Go',
    detect(dir) {
      return fs.existsSync(path.join(dir, 'go.mod'));
    },
  },
  java: {
    label: 'Java',
    stack: 'Java',
    detect(dir) {
      return (
        fs.existsSync(path.join(dir, 'pom.xml')) ||
        fs.existsSync(path.join(dir, 'build.gradle')) ||
        fs.existsSync(path.join(dir, 'build.gradle.kts'))
      );
    },
  },
  csharp: {
    label: 'C#',
    stack: 'C# / .NET',
    detect(dir) {
      try {
        return fs
          .readdirSync(dir)
          .some((f) => f.endsWith('.sln') || f.endsWith('.csproj'));
      } catch {
        return false;
      }
    },
  },
  python: {
    label: 'Python',
    stack: 'Python',
    detect(dir) {
      return (
        fs.existsSync(path.join(dir, 'requirements.txt')) ||
        fs.existsSync(path.join(dir, 'pyproject.toml')) ||
        fs.existsSync(path.join(dir, 'setup.py'))
      );
    },
  },
  rust: {
    label: 'Rust',
    stack: 'Rust',
    detect(dir) {
      return fs.existsSync(path.join(dir, 'Cargo.toml'));
    },
  },
  empty: {
    label: 'Empty Project',
    stack: 'Generic',
    detect() {
      return false;
    },
  },
};

/** Ordered list of keys for display in the wizard. */
const PROJECT_TYPE_KEYS = ['nodejs', 'go', 'java', 'csharp', 'python', 'rust', 'empty'];

/**
 * Auto-detect the project type for a given directory.
 * Returns the matching key or 'empty' when nothing is found.
 */
function detectProjectType(dir) {
  for (const key of PROJECT_TYPE_KEYS) {
    if (key === 'empty') continue;
    if (PROJECT_TYPES[key].detect(dir)) return key;
  }
  return 'empty';
}

module.exports = { PROJECT_TYPES, PROJECT_TYPE_KEYS, detectProjectType };
