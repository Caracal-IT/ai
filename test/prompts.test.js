const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

test('prompts are not loaded in non-TTY mode', () => {
  const promptsPath = path.resolve(__dirname, '..', 'lib', 'prompts.js');
  const script = `
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@inquirer/prompts') {
    throw new Error('prompts package should not load in non-TTY mode');
  }
  return originalLoad.call(this, request, parent, isMain);
};
Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
(async () => {
  const prompts = require(${JSON.stringify(promptsPath)});
  const result = await prompts.confirm(null, 'Question?', false);
  if (result !== false) {
    throw new Error('Expected default value in non-TTY mode');
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

  const result = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
});
