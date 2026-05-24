const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const cliPath = path.resolve(__dirname, '..', 'bin', 'ai.js');

/* ─────────────────────────────────────────────────────────────────────────────
   init command
   ──────────────────────────────────────────────────────────────────────────── */

test('init creates .ai/ and .github/ structure', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-'));
  const output = execFileSync(process.execPath, [cliPath, 'init', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /AI workspace ready/);

  // .ai/ source-of-truth files
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'project.ai.json')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'instructions', 'getting-started.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'skills', 'default.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'agents', 'default.json')), true);

  // .github/ generated layer
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'instructions', 'getting-started.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'default.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'agents', 'default.json')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.gitignore')), true);
  const gitignore = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8');
  assert.match(gitignore, /^\.github\/instructions\/$/m);
  assert.match(gitignore, /^\.github\/skills\/$/m);
  assert.match(gitignore, /^\.github\/agents\/$/m);

  // README
  assert.equal(fs.existsSync(path.join(projectDir, 'README.md')), true);

  // project.ai.json must be valid JSON with expected fields
  const config = JSON.parse(
    fs.readFileSync(path.join(projectDir, '.ai', 'project.ai.json'), 'utf8'),
  );
  assert.equal(config.version, 2);
  assert.ok(config.type);
  assert.ok(config.selections);
  assert.ok(Array.isArray(config.instructions));
  assert.ok(Array.isArray(config.skills));
  assert.ok(Array.isArray(config.agents));
});

test('init preserves existing files when run again', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-existing-'));
  const instructionPath = path.join(
    projectDir,
    '.ai',
    'instructions',
    'getting-started.md',
  );

  // Pre-create the file with custom content
  fs.mkdirSync(path.dirname(instructionPath), { recursive: true });
  fs.writeFileSync(instructionPath, '# My custom instruction\n', 'utf8');

  const output = execFileSync(process.execPath, [cliPath, 'init', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /Skipped existing [1-9]\d* file\(s\)\./);
  assert.equal(fs.readFileSync(instructionPath, 'utf8'), '# My custom instruction\n');
});

test('init defaults to current directory when no target given', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-init-cwd-'));
  const output = execFileSync(process.execPath, [cliPath, 'init'], {
    encoding: 'utf8',
    cwd: projectDir,
  });

  assert.match(output, /AI workspace ready/);
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'project.ai.json')), true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   generate / update command
   ──────────────────────────────────────────────────────────────────────────── */

test('generate rebuilds .github/ from .ai/', () => {
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
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'instructions', 'getting-started.md')), true);
});

test('update pre-marks installed items and recopies them', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-update-'));
  execFileSync(process.execPath, [cliPath, 'init', projectDir], { encoding: 'utf8' });

  const configPath = path.join(projectDir, '.ai', 'project.ai.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.selections = { capabilities: ['authentication'] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  fs.rmSync(path.join(projectDir, '.ai', 'skills', 'authentication.md'), { force: true });
  fs.rmSync(path.join(projectDir, '.github', 'skills', 'authentication.md'), { force: true });

  const output = execFileSync(process.execPath, [cliPath, 'update', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /AI selections updated/);
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'skills', 'authentication.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.github', 'skills', 'authentication.md')), true);
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
  assert.equal(fs.existsSync(path.join(projectDir, '.ai', 'project.ai.json')), true);
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
