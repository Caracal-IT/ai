const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { getSourceCatalog } = require('../cli/catalog');
const { parseFrontMatter } = require('../test-helpers/front-matter');

const cliPath = path.resolve(__dirname, '..', 'bin', 'ai.js');

function githubManagedPath(fileGroup, relFile) {
  const parts = relFile.split('/');
  if (fileGroup !== 'skills') return path.join('.github', fileGroup, ...parts);

  const basename = path.posix.basename(relFile).toLowerCase();
  if (basename === 'skill.md') {
    // Already folder-based: keep as-is
    return path.join('.github', 'skills', ...parts);
  }
  if (!relFile.includes('/')) {
    // Flat legacy format → folder/SKILL.md
    const parsed = path.posix.parse(relFile);
    return path.join('.github', 'skills', parsed.name, 'SKILL.md');
  }
  // Supporting file inside a skill folder, copy as-is
  return path.join('.github', 'skills', ...parts);
}

/* ─────────────────────────────────────────────────────────────────────────────
   init command
   ──────────────────────────────────────────────────────────────────────────── */

test('init creates .github/ structure without creating .ai/', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-'));
  const output = execFileSync(process.execPath, [cliPath, 'init', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /AI workspace ready/);

  // project.ai.json lives at the project root
  assert.equal(fs.existsSync(path.join(projectDir, 'project.ai.json')), true);

  // .ai/ must not be created
  assert.equal(fs.existsSync(path.join(projectDir, '.ai')), false);

  // .github/ generated layer
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'feature-documentation', 'SKILL.md')), true);
  const generatedSkill = fs.readFileSync(
    path.join(projectDir, '.github', 'skills', 'feature-documentation', 'SKILL.md'),
    'utf8',
  );
  const skillFrontMatter = parseFrontMatter(generatedSkill);
  assert.ok(skillFrontMatter);
  assert.ok(skillFrontMatter.name);
  assert.ok(skillFrontMatter.description);
  assert.ok(skillFrontMatter.whenToUse);

  // .github/ managed files must NOT be in .gitignore (they are source-controlled)
  const gitignorePath = path.join(projectDir, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  assert.doesNotMatch(gitignore, /^\.github\/instructions\/$/m);
  assert.doesNotMatch(gitignore, /^\.github\/skills\/$/m);
  assert.doesNotMatch(gitignore, /^\.github\/agents\/$/m);

  // README
  assert.equal(fs.existsSync(path.join(projectDir, 'README.md')), true);

  // project.ai.json must be valid JSON with expected fields
  const config = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'project.ai.json'), 'utf8'),
  );
  assert.equal(config.version, 3);
  assert.ok(config.type);
  assert.ok(config.selections);
  assert.ok(Array.isArray(config.instructions));
  assert.ok(Array.isArray(config.skills));
  assert.ok(Array.isArray(config.agents));
  assert.ok(Array.isArray(config.excluded));
  assert.ok(Array.isArray(config.managed));

  // Managed files must include the generated .github/ files
  assert.ok(config.managed.some((f) => f.startsWith('.github/')));
});

test('init preserves existing files when run again', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-existing-'));
  const skillPath = path.join(
    projectDir,
    '.github',
    'skills',
    'feature-documentation',
    'SKILL.md',
  );

  // Pre-create the file with custom content
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, '# My custom skill\n', 'utf8');

  const output = execFileSync(process.execPath, [cliPath, 'init', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /Skipped existing [1-9]\d* file\(s\)\./);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), '# My custom skill\n');
});

test('init defaults to current directory when no target given', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-cwd-'));
  const output = execFileSync(process.execPath, [cliPath, 'init'], {
    encoding: 'utf8',
    cwd: projectDir,
  });

  assert.match(output, /AI workspace ready/);
  assert.equal(fs.existsSync(path.join(projectDir, 'project.ai.json')), true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   generate / update command
   ──────────────────────────────────────────────────────────────────────────── */

test('generate rebuilds .github/', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-generate-'));

  // Initialise first
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  // Remove the generated layer to verify generate recreates it
  fs.rmSync(path.join(projectDir, '.github'), { recursive: true, force: true });

  const output = execFileSync(
    process.execPath,
    [cliPath, 'generate', projectDir],
    { encoding: 'utf8' },
  );

  assert.match(output, /\.github\/ regenerated/);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'feature-documentation', 'SKILL.md')), true);
});

test('wizard catalog includes capabilities section', () => {
  const catalog = getSourceCatalog();
  assert.equal(catalog.categories.some((category) => category.key === 'capabilities'), true);
});

test('wizard calls confirm before selectMany when interactive', async () => {
  const wizardPath = require.resolve('../cli/wizard');
  const promptsPath = require.resolve('../lib/prompts');
  const originalWizard = require.cache[wizardPath];
  const originalPrompts = require.cache[promptsPath];
  const originalStdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const calls = [];

  require.cache[promptsPath] = {
    id: promptsPath,
    filename: promptsPath,
    loaded: true,
    exports: {
      createRL() {
        calls.push('createRL');
        return {
          close() {
            calls.push('close');
          },
        };
      },
      async confirm() {
        calls.push('confirm');
        return true;
      },
      async selectOne() {
        calls.push('selectOne');
        return 'empty';
      },
      async selectMany() {
        calls.push('selectMany');
        return [];
      },
    },
  };
  delete require.cache[wizardPath];
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

  try {
    const { runWizard } = require('../cli/wizard');
    const result = await runWizard('nodejs', { categories: [] });

    assert.equal(result.projectType, 'nodejs');
    assert.ok(calls.includes('confirm'), 'confirm should be called when interactive');
    assert.ok(calls.indexOf('confirm') < calls.indexOf('close'), 'confirm should come before close');
    assert.ok(!calls.includes('clear'), 'console should not be cleared');
  } finally {
    delete require.cache[wizardPath];
    if (originalWizard) require.cache[wizardPath] = originalWizard;
    if (originalPrompts) require.cache[promptsPath] = originalPrompts;
    else delete require.cache[promptsPath];
    if (originalStdinTTY) Object.defineProperty(process.stdin, 'isTTY', originalStdinTTY);
    else delete process.stdin.isTTY;
  }
});

test('update pre-marks installed items, recopies them, and removes deselected files', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const catalog = getSourceCatalog();
  const category = catalog.categories.find((entry) => entry.items.length > 0);
  assert.ok(category);
  const item = category.items.find((entry) => (
    entry.files.instructions.length > 0
    || entry.files.skills.length > 0
    || entry.files.agents.length > 0
  ));
  assert.ok(item);
  const fileGroup = item.files.instructions.length > 0
    ? 'instructions'
    : item.files.skills.length > 0
      ? 'skills'
      : 'agents';
  const selectedFile = item.files[fileGroup][0];
  assert.ok(selectedFile);

  const configPath = path.join(projectDir, 'project.ai.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { [category.key]: [item.key] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  fs.rmSync(path.join(projectDir, githubManagedPath(fileGroup, selectedFile)), { force: true });

  const output = execFileSync(process.execPath, [cliPath, 'update', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /AI selections updated/);
  assert.equal(fs.existsSync(path.join(projectDir, githubManagedPath(fileGroup, selectedFile))), true);

  config.selections = { [category.key]: [] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  assert.equal(fs.existsSync(path.join(projectDir, githubManagedPath(fileGroup, selectedFile))), false);
});

test('update keeps tracked files under managed .github directories', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-tracked-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  execFileSync('git', ['init'], { cwd: projectDir, stdio: 'ignore' });
  const trackedFile = path.join(projectDir, '.github', 'skills', 'tracked.md');
  fs.mkdirSync(path.dirname(trackedFile), { recursive: true });
  fs.writeFileSync(trackedFile, '# keep\n', 'utf8');
  execFileSync('git', ['add', '-f', '.github/skills/tracked.md'], { cwd: projectDir, stdio: 'ignore' });

  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  assert.equal(fs.existsSync(trackedFile), true);
});

test('update removes git-tracked managed files when item is deselected', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-deselect-tracked-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  // Find a selectable item to add then remove
  const catalog = getSourceCatalog();
  const category = catalog.categories.find((entry) => entry.items.length > 0);
  assert.ok(category);
  const item = category.items.find((entry) => (
    entry.files.instructions.length > 0
    || entry.files.skills.length > 0
    || entry.files.agents.length > 0
  ));
  assert.ok(item);
  const fileGroup = item.files.instructions.length > 0
    ? 'instructions'
    : item.files.skills.length > 0
      ? 'skills'
      : 'agents';
  const selectedFile = item.files[fileGroup][0];
  assert.ok(selectedFile);

  // Select the item and run update so the file is generated
  const configPath = path.join(projectDir, 'project.ai.json');
  let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { [category.key]: [item.key] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  const managedFilePath = path.join(projectDir, githubManagedPath(fileGroup, selectedFile));
  assert.equal(fs.existsSync(managedFilePath), true, 'file must exist after selection');

  // Simulate the user committing the generated file to git
  execFileSync('git', ['init'], { cwd: projectDir, stdio: 'ignore' });
  execFileSync('git', ['add', '-f', '--', githubManagedPath(fileGroup, selectedFile)], { cwd: projectDir, stdio: 'ignore' });

  // Deselect the item and run update — file must be removed even though it is git-tracked
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { [category.key]: [] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  assert.equal(fs.existsSync(managedFilePath), false, 'deselected managed file must be removed even when git-tracked');

  // project.ai.json managed list must not contain the removed file
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const managedRel = githubManagedPath(fileGroup, selectedFile).split(path.sep).join('/');
  assert.equal(
    config.managed.includes(managedRel),
    false,
    'project.ai.json managed list must not contain the deselected file',
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   project.ai.json root placement and excluded/managed tracking
   ──────────────────────────────────────────────────────────────────────────── */

test('init records pre-existing .github/ files in excluded list', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-excluded-'));

  // Place a pre-existing file in .github/ before init
  const preExistingFile = path.join(projectDir, '.github', 'manual', 'copilot-instructions.md');
  fs.mkdirSync(path.dirname(preExistingFile), { recursive: true });
  fs.writeFileSync(preExistingFile, '# Pre-existing\n', 'utf8');

  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.ai.json'), 'utf8'));
  assert.ok(config.excluded.includes('.github/manual/'), 'pre-existing folder must be excluded');
  assert.equal(
    config.excluded.includes('.github/manual/copilot-instructions.md'),
    false,
    'excluded list should prefer the folder over every child file',
  );
  // The pre-existing file must not be modified
  assert.equal(fs.readFileSync(preExistingFile, 'utf8'), '# Pre-existing\n');
});

test('init records generated .github/ files in managed list', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-managed-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.ai.json'), 'utf8'));
  assert.ok(Array.isArray(config.managed));
  assert.ok(config.managed.length > 0, 'managed list must be non-empty after init');
  assert.ok(
    config.managed.includes('.github/skills/feature-documentation/'),
    'managed list must include generated folders',
  );
  assert.equal(
    config.managed.includes('.github/skills/feature-documentation/SKILL.md'),
    false,
    'managed list should prefer the generated folder over every child file',
  );
  assert.ok(
    config.managed.every((f) => f.startsWith('.github/')),
    'all managed entries must be under .github/',
  );
});

test('ensureGitignore removes old .github/ ignore entries for source control', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-gitignore-migrate-'));
  const gitignorePath = path.join(projectDir, '.gitignore');

  // Simulate an old-style .gitignore with the entries we should remove
  fs.writeFileSync(
    gitignorePath,
    'node_modules/\n.github/instructions/\n.github/skills/\n.github/agents/\n',
    'utf8',
  );

  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  assert.doesNotMatch(gitignore, /^\.github\/instructions\/$/m);
  assert.doesNotMatch(gitignore, /^\.github\/skills\/$/m);
  assert.doesNotMatch(gitignore, /^\.github\/agents\/$/m);
  // Other entries must be preserved
  assert.match(gitignore, /node_modules\//);
});

test('update adds unknown .github/ files to excluded automatically', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-unknown-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  // Simulate a manually added file (not managed by the tool)
  const manualFile = path.join(projectDir, '.github', 'copilot-instructions.md');
  fs.writeFileSync(manualFile, '# Manual\n', 'utf8');

  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.ai.json'), 'utf8'));
  // Unknown files are automatically added to excluded and never deleted.
  assert.ok(
    config.excluded.includes('.github/copilot-instructions.md'),
    'unknown file must be added to excluded list',
  );
  assert.equal(fs.existsSync(manualFile), true, 'manually added file must not be deleted');
});

test('update preserves excluded folders inside managed .github directories', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-excluded-folder-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const manualFile = path.join(projectDir, '.github', 'skills', 'manual', 'SKILL.md');
  fs.mkdirSync(path.dirname(manualFile), { recursive: true });
  fs.writeFileSync(manualFile, '# Manual\n', 'utf8');

  const configPath = path.join(projectDir, 'project.ai.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.excluded = ['.github/skills/manual/'];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(fs.existsSync(manualFile), true, 'excluded folder contents must stay untouched');
  assert.equal(fs.readFileSync(manualFile, 'utf8'), '# Manual\n');
  assert.ok(updated.excluded.includes('.github/skills/manual/'));
  assert.equal(
    updated.excluded.includes('.github/skills/manual/SKILL.md'),
    false,
    'folder exclusions must be honored without expanding to every child file',
  );
});

test('update removes git-tracked managed files when managed entry is stored as a folder', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-managed-folder-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const catalog = getSourceCatalog();
  const category = catalog.categories.find((entry) => entry.items.some((item) => item.files.skills.length > 0));
  assert.ok(category);
  const item = category.items.find((entry) => entry.files.skills.length > 0);
  assert.ok(item);
  const selectedFile = item.files.skills[0];
  assert.ok(selectedFile);

  const configPath = path.join(projectDir, 'project.ai.json');
  let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { [category.key]: [item.key] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  const managedRel = githubManagedPath('skills', selectedFile).split(path.sep).join('/');
  const managedFolderRel = `${path.posix.dirname(managedRel)}/`;
  const managedFilePath = path.join(projectDir, managedRel);
  assert.equal(fs.existsSync(managedFilePath), true, 'file must exist after selection');

  execFileSync('git', ['init'], { cwd: projectDir, stdio: 'ignore' });
  execFileSync('git', ['add', '-f', '--', managedRel], { cwd: projectDir, stdio: 'ignore' });

  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { [category.key]: [] };
  config.managed = [managedFolderRel];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [cliPath, 'update', projectDir], { encoding: 'utf8' });

  assert.equal(
    fs.existsSync(managedFilePath),
    false,
    'folder-based managed entries must still remove deselected tracked files',
  );
});

test('backward compat: generate still works when only legacy .ai/project.ai.json exists', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-legacy-'));
  // Run init once to get the root config, then rename it to legacy location
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const rootConfig = path.join(projectDir, 'project.ai.json');
  const legacyConfig = path.join(projectDir, '.ai', 'project.ai.json');
  fs.mkdirSync(path.dirname(legacyConfig), { recursive: true });
  fs.renameSync(rootConfig, legacyConfig);

  // Remove .github/ so generate must recreate it
  fs.rmSync(path.join(projectDir, '.github'), { recursive: true, force: true });

  const output = execFileSync(
    process.execPath,
    [cliPath, 'generate', projectDir],
    { encoding: 'utf8' },
  );
  assert.match(output, /\.github\/ regenerated/);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'feature-documentation', 'SKILL.md')), true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   setup alias (backward compat / deprecated)
   ──────────────────────────────────────────────────────────────────────────── */

test('setup alias still works and prints deprecation warning', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-setup-compat-'));
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(
    process.execPath,
    [cliPath, 'setup', projectDir],
    { encoding: 'utf8' },
  );

  const combined = result.stdout + result.stderr;
  assert.match(combined, /deprecated/i);
  assert.match(result.stdout, /AI workspace ready/);
  assert.equal(fs.existsSync(path.join(projectDir, 'project.ai.json')), true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   unknown command
   ──────────────────────────────────────────────────────────────────────────── */

test('unknown command exits with code 1', () => {
  let threw = false;
  try {
    execFileSync(process.execPath, [cliPath, 'foobar'], { encoding: 'utf8' });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 1);
  }
  assert.equal(threw, true);
});
