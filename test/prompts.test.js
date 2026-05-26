const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

function withTTY(value, callback) {
  const originalStdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      if (originalStdinTTY) Object.defineProperty(process.stdin, 'isTTY', originalStdinTTY);
      else delete process.stdin.isTTY;
    });
}

function createFakeInterface(answers) {
  return {
    question(_prompt, callback) {
      callback(answers.shift() ?? '');
    },
    close() {},
  };
}

async function withCapturedStdout(callback) {
  const mockedWrite = test.mock.method(process.stdout, 'write', () => true);

  try {
    return await callback();
  } finally {
    mockedWrite.mock.restore();
  }
}

test('prompts are not loaded in non-TTY mode', async () => {
  const promptsPath = require.resolve('../lib/prompts');
  delete require.cache[promptsPath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@inquirer/prompts') {
      throw new Error('prompts package should not load');
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const prompts = require('../lib/prompts');
    await withTTY(false, async () => {
      const result = await prompts.confirm(null, 'Question?', false);
      assert.equal(result, false);
    });
  } finally {
    Module._load = originalLoad;
  }
});

test('confirm accepts blank input, parses yes/no answers, and retries on invalid input', async () => {
  const prompts = require('../lib/prompts');
  await withTTY(true, async () => {
    await withCapturedStdout(async () => {
      const defaultResult = await prompts.confirm(createFakeInterface(['']), 'Question?', true);
      assert.equal(defaultResult, true);

      const affirmativeResult = await prompts.confirm(createFakeInterface(['y']), 'Question?', false);
      assert.equal(affirmativeResult, true);

      const negativeResult = await prompts.confirm(createFakeInterface(['no']), 'Question?', true);
      assert.equal(negativeResult, false);

      const retryResult = await prompts.confirm(createFakeInterface(['maybe', 'yes']), 'Question?', false);
      assert.equal(retryResult, true);
    });
  });
});

test('selectOne retries until a valid numeric selection is provided', async () => {
  const prompts = require('../lib/prompts');
  await withTTY(true, async () => {
    await withCapturedStdout(async () => {
      const rl = createFakeInterface(['9', '2']);
      const result = await prompts.selectOne(
        rl,
        'Select project type',
        [['empty', 'Empty'], ['nodejs', 'Node.js']],
        'empty',
      );

      assert.equal(result, 'nodejs');
    });
  });
});

test('selectMany returns defaults on blank input and parses comma-separated selections', async () => {
  const prompts = require('../lib/prompts');
  await withTTY(true, async () => {
    await withCapturedStdout(async () => {
      const defaultsResult = await prompts.selectMany(
        createFakeInterface(['']),
        'Select capabilities',
        [['auth', 'Authentication'], ['docs', 'Documentation']],
        ['docs', 'stale'],
      );
      assert.deepEqual(defaultsResult, ['docs']);

      const customResult = await prompts.selectMany(
        createFakeInterface(['2, 1, 2']),
        'Select capabilities',
        [['auth', 'Authentication'], ['docs', 'Documentation']],
        [],
      );
      assert.deepEqual(customResult, ['docs', 'auth']);
    });
  });
});
