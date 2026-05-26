const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

function withTTY(t, value, callback) {
  const originalStdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
  t.after(() => {
    if (originalStdinTTY) Object.defineProperty(process.stdin, 'isTTY', originalStdinTTY);
    else delete process.stdin.isTTY;
  });
  return Promise.resolve().then(callback);
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

function withMockedInquirerPrompts(stubs, callback) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@inquirer/prompts') {
      return stubs;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Module._load = originalLoad;
    });
}

function withUnavailableInquirerPrompts(callback) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@inquirer/prompts') {
      const err = new Error("Cannot find module '@inquirer/prompts'");
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Module._load = originalLoad;
    });
}

test('prompts are not loaded in non-TTY mode', { concurrency: false }, async (t) => {
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
    await withTTY(t, false, async () => {
      const result = await prompts.confirm(null, 'Question?', false);
      assert.equal(result, false);
    });
  } finally {
    Module._load = originalLoad;
  }
});

test('confirm accepts blank input, parses yes/no answers, and retries on invalid input', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
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

test('selectOne uses @inquirer/prompts select and clears menu when available', { concurrency: false }, async (t) => {
  const promptsPath = require.resolve('../lib/prompts');
  const calls = [];
  delete require.cache[promptsPath];

  await withMockedInquirerPrompts({
    select(config, context) {
      calls.push({ config, context });
      return Promise.resolve('nodejs');
    },
  }, async () => {
    const prompts = require('../lib/prompts');
    await withTTY(t, true, async () => {
      const result = await prompts.selectOne(
        createFakeInterface(['']),
        'Select project type',
        [['empty', 'Empty'], ['nodejs', 'Node.js']],
        'empty',
      );

      assert.equal(result, 'nodejs');
    });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].config.message, 'Select project type');
  assert.equal(calls[0].config.message, 'Select project type');
  assert.deepEqual(calls[0].config.instructions, {
    navigation: 'Use ↑↓ to move, Enter to confirm.',
    pager: 'Use ↑↓ to move, Enter to confirm.',
  });
  assert.equal(calls[0].config.default, 'empty');
  assert.deepEqual(
    calls[0].config.choices.map((choice) => [choice.value, choice.name]),
    [['empty', 'Empty'], ['nodejs', 'Node.js']],
  );
  assert.equal(calls[0].context.clearPromptOnDone, true);
});

test('selectOne retries until a valid numeric selection is provided when prompts package is unavailable', { concurrency: false }, async (t) => {
  const promptsPath = require.resolve('../lib/prompts');
  delete require.cache[promptsPath];
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
    await withCapturedStdout(async () => {
      await withUnavailableInquirerPrompts(async () => {
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
});

test('selectMany uses @inquirer/prompts checkbox with pre-selected defaults', { concurrency: false }, async (t) => {
  const promptsPath = require.resolve('../lib/prompts');
  const calls = [];
  delete require.cache[promptsPath];

  await withMockedInquirerPrompts({
    checkbox(config, context) {
      calls.push({ config, context });
      return Promise.resolve(['docs']);
    },
  }, async () => {
    const prompts = require('../lib/prompts');
    await withTTY(t, true, async () => {
      const result = await prompts.selectMany(
        createFakeInterface(['']),
        'Select capabilities',
        [['auth', 'Authentication'], ['docs', 'Documentation']],
        ['docs', 'stale'],
      );

      assert.deepEqual(result, ['docs']);
    });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].config.message, 'Select capabilities');
  assert.equal(calls[0].config.instructions, 'Use ↑↓ to move, space to select, Enter to confirm.');
  assert.deepEqual(
    calls[0].config.choices.map((choice) => [choice.value, choice.checked]),
    [['auth', false], ['docs', true]],
  );
  assert.equal(calls[0].context.clearPromptOnDone, true);
});

test('package.json installs @inquirer/prompts as a runtime dependency', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.dependencies['@inquirer/prompts'], '^7.10.1');
  assert.equal(pkg.optionalDependencies?.['@inquirer/prompts'], undefined);
});

test('selectMany returns defaults on blank input and parses comma-separated selections when prompts package is unavailable', { concurrency: false }, async (t) => {
  const promptsPath = require.resolve('../lib/prompts');
  delete require.cache[promptsPath];
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
    await withCapturedStdout(async () => {
      await withUnavailableInquirerPrompts(async () => {
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
});
