const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');

function withTTY(t, value, callback) {
  const originalStdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
  t.after(() => {
    if (originalStdinTTY) Object.defineProperty(process.stdin, 'isTTY', originalStdinTTY);
    else delete process.stdin.isTTY;
  });
  return Promise.resolve().then(callback);
}

function createFakeInterface(answers, overrides = {}) {
  return {
    input: overrides.input,
    output: overrides.output,
    pause() {},
    resume() {},
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

function createInteractiveInterface() {
  const input = new EventEmitter();
  input.isTTY = true;
  input.isRaw = false;
  input.rawModes = [];
  input.setRawMode = (value) => {
    input.isRaw = value;
    input.rawModes.push(value);
  };
  input.resume = () => {
    input.resumed = true;
  };
  input.pause = () => {
    input.paused = true;
  };

  const writes = [];
  const output = {
    isTTY: true,
    write(chunk) {
      writes.push(String(chunk));
      return true;
    },
  };

  const rl = createFakeInterface([], { input, output });
  rl.pause = () => {
    rl.pauseCalled = true;
  };
  rl.resume = () => {
    rl.resumeCalled = true;
  };

  return { rl, input, output, writes };
}

function pressKeys(input, keys) {
  setImmediate(() => {
    for (const key of keys) {
      input.emit('keypress', key.sequence ?? '', key);
    }
  });
}

test('prompts return defaults in non-TTY mode', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, false, async () => {
    const confirmResult = await prompts.confirm(null, 'Question?', false);
    assert.equal(confirmResult, false);
    const singleResult = await prompts.selectOne(null, 'Select project type', [['empty', 'Empty']], 'empty');
    assert.equal(singleResult, 'empty');
    const manyResult = await prompts.selectMany(null, 'Select capabilities', [['docs', 'Documentation']], ['docs']);
    assert.deepEqual(manyResult, ['docs']);
  });
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

test('selectOne uses dependency-free interactive navigation and clears the menu on submit', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
    const { rl, input, writes } = createInteractiveInterface();
    pressKeys(input, [
      { name: 'down' },
      { name: 'return', sequence: '\r' },
    ]);

    const result = await prompts.selectOne(
      rl,
      'Select project type',
      [['empty', 'Empty'], ['nodejs', 'Node.js']],
      'empty',
    );

    assert.equal(result, 'nodejs');
    assert.deepEqual(input.rawModes, [true, false]);
    assert.equal(rl.pauseCalled, true);
    assert.equal(rl.resumeCalled, true);

    const outputText = writes.join('');
    assert.match(outputText, /Use ↑↓ to move, Enter to confirm\./);
    assert.match(outputText, /Select project type: Node\.js/);
    assert.match(outputText, /\u001b\[[0-9;]*J/);
  });
});

test('selectOne retries until a valid numeric selection is provided when raw interactive input is unavailable', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
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

test('selectMany uses dependency-free interactive navigation with space and Enter guidance', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
    const { rl, input, writes } = createInteractiveInterface();
    pressKeys(input, [
      { name: 'up' },
      { name: 'space', sequence: ' ' },
      { name: 'return', sequence: '\r' },
    ]);

    const result = await prompts.selectMany(
      rl,
      'Select capabilities',
      [['auth', 'Authentication'], ['docs', 'Documentation']],
      ['docs', 'stale'],
    );

    assert.deepEqual(result, ['auth', 'docs']);
    assert.deepEqual(input.rawModes, [true, false]);
    assert.equal(rl.pauseCalled, true);
    assert.equal(rl.resumeCalled, true);

    const outputText = writes.join('');
    assert.match(outputText, /Use ↑↓ to move, space to select, Enter to confirm\./);
    assert.match(outputText, /Select capabilities: Authentication, Documentation/);
    assert.match(outputText, /\u001b\[[0-9;]*J/);
  });
});

test('package.json does not declare npm dependencies', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.optionalDependencies, undefined);
});

test('selectMany returns defaults on blank input and parses comma-separated selections when raw interactive input is unavailable', { concurrency: false }, async (t) => {
  const prompts = require('../lib/prompts');
  await withTTY(t, true, async () => {
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
