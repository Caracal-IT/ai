const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const cliPath = path.resolve(__dirname, '..', 'bin', 'ai.js');

test('setup creates the AI manifest and starter assets', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-setup-'));
  const output = execFileSync(process.execPath, [cliPath, 'setup', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /AI environment ready/);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'ai.config.json'), 'utf8'),
  );

  assert.deepEqual(manifest.instructions, ['instructions/getting-started.md']);
  assert.deepEqual(manifest.skills, ['skills/default.json']);
  assert.deepEqual(manifest.agents, ['agents/default.json']);
  assert.equal(
    fs.existsSync(path.join(projectDir, 'instructions', 'getting-started.md')),
    true,
  );
  assert.equal(fs.existsSync(path.join(projectDir, 'skills', 'default.json')), true);
  assert.equal(fs.existsSync(path.join(projectDir, 'agents', 'default.json')), true);
});

test('setup preserves existing files when run again', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-setup-existing-'));
  const instructionPath = path.join(projectDir, 'instructions', 'getting-started.md');

  fs.mkdirSync(path.dirname(instructionPath), { recursive: true });
  fs.writeFileSync(instructionPath, '# Custom instruction\n', 'utf8');

  const output = execFileSync(process.execPath, [cliPath, 'setup', projectDir], {
    encoding: 'utf8',
  });

  assert.match(output, /Skipped existing 1 file\(s\)\.|Skipped existing [1-9]\d* file\(s\)\./);
  assert.equal(fs.readFileSync(instructionPath, 'utf8'), '# Custom instruction\n');
});
