const readline = require('node:readline');

function createRL() {
  if (!process.stdin.isTTY) {
    return {
      close() {},
    };
  }

  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl, promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, resolve);
  });
}

function normalizeAnswer(answer) {
  return answer.trim().toLowerCase();
}

async function readRequiredAnswer(rl, promptText, parseAnswer) {
  while (true) {
    const answer = await askQuestion(rl, promptText);
    const parsedAnswer = parseAnswer(answer);
    if (parsedAnswer.valid) {
      return parsedAnswer.value;
    }
  }
}

async function confirm(rl, question, defaultValue = true) {
  if (!process.stdin.isTTY) {
    return defaultValue;
  }

  const suffix = defaultValue ? 'Y/n' : 'y/N';
  return readRequiredAnswer(rl, `${question} (${suffix}) `, (answer) => {
    const normalizedAnswer = normalizeAnswer(answer);
    if (!normalizedAnswer) {
      return { valid: true, value: defaultValue };
    }
    if (['y', 'yes'].includes(normalizedAnswer)) {
      return { valid: true, value: true };
    }
    if (['n', 'no'].includes(normalizedAnswer)) {
      return { valid: true, value: false };
    }
    process.stdout.write('Please answer yes or no.\n');
    return { valid: false };
  });
}

function printChoices(title, items, selectedKeys = new Set()) {
  process.stdout.write(`\n${title}\n`);
  items.forEach(([key, label], index) => {
    const prefix = selectedKeys.has(key) ? '[x]' : '[ ]';
    process.stdout.write(`  ${index + 1}. ${prefix} ${label}\n`);
  });
}

function getPromptStreams(rl) {
  return {
    input: rl?.input || process.stdin,
    output: rl?.output || process.stdout,
  };
}

function supportsInteractiveSelection(rl) {
  const input = rl?.input;
  const output = rl?.output;
  return Boolean(
    input
    && output
    && input.isTTY
    && output.isTTY
    && typeof output.write === 'function'
    && typeof input.setRawMode === 'function',
  );
}

function clearRenderedPrompt(output, lineCount) {
  if (lineCount <= 0) return;
  readline.moveCursor(output, 0, -lineCount);
  readline.cursorTo(output, 0);
  readline.clearScreenDown(output);
}

function renderPromptLines(output, title, items, activeIndex, selectedKeys, helpText, singleSelect) {
  const lines = [
    title,
    ...items.map(([key, label], index) => {
      const cursor = index === activeIndex ? '❯' : ' ';
      const marker = singleSelect
        ? (index === activeIndex ? '(●)' : '( )')
        : (selectedKeys.has(key) ? '[x]' : '[ ]');
      return `${cursor} ${marker} ${label}`;
    }),
    helpText,
  ];

  output.write(`${lines.join('\n')}\n`);
  return lines.length;
}

function formatSelectionSummary(items, selectedKeys) {
  const selectedSet = new Set(selectedKeys);
  const labels = items
    .filter(([key]) => selectedSet.has(key))
    .map(([, label]) => label);

  return labels.length > 0 ? labels.join(', ') : '(none)';
}

async function runInteractiveSelection(rl, title, items, {
  activeIndex,
  helpText,
  selectedKeys = [],
  singleSelect = false,
}) {
  const { input, output } = getPromptStreams(rl);
  const initialRawMode = input.isRaw === true;
  const selectedSet = new Set(selectedKeys);
  let renderedLineCount = 0;

  if (typeof rl?.pause === 'function') {
    rl.pause();
  }
  if (typeof input.resume === 'function') {
    input.resume();
  }

  return new Promise((resolve, reject) => {
    function cleanup() {
      input.removeListener('keypress', onKeypress);
      clearRenderedPrompt(output, renderedLineCount);
      if (!initialRawMode) {
        input.setRawMode(false);
      }
      if (typeof rl?.resume === 'function') {
        rl.resume();
      }
    }

    function finish(value, summary) {
      cleanup();
      output.write(`${title}: ${summary}\n`);
      resolve(value);
    }

    function onKeypress(_str, key = {}) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Prompt cancelled'));
        return;
      }

      if (key.name === 'up') {
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (key.name === 'down') {
        activeIndex = (activeIndex + 1) % items.length;
      } else if (!singleSelect && key.name === 'space') {
        const selectedKey = items[activeIndex][0];
        if (selectedSet.has(selectedKey)) selectedSet.delete(selectedKey);
        else selectedSet.add(selectedKey);
      } else if (key.name === 'return' || key.name === 'enter') {
        if (singleSelect) {
          const selectedKey = items[activeIndex][0];
          finish(selectedKey, items[activeIndex][1]);
          return;
        }

        const selectedValues = items
          .filter(([key]) => selectedSet.has(key))
          .map(([key]) => key);
        finish(selectedValues, formatSelectionSummary(items, selectedValues));
        return;
      } else {
        return;
      }

      clearRenderedPrompt(output, renderedLineCount);
      renderedLineCount = renderPromptLines(
        output,
        title,
        items,
        activeIndex,
        selectedSet,
        helpText,
        singleSelect,
      );
    }

    readline.emitKeypressEvents(input);
    if (!initialRawMode) {
      input.setRawMode(true);
    }

    input.on('keypress', onKeypress);
    renderedLineCount = renderPromptLines(
      output,
      title,
      items,
      activeIndex,
      selectedSet,
      helpText,
      singleSelect,
    );
  });
}

function findDefaultIndex(items, defaultKey) {
  const defaultIndex = items.findIndex(([key]) => key === defaultKey);
  return defaultIndex >= 0 ? defaultIndex + 1 : null;
}

function parseSingleSelection(answer, items, defaultKey) {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) {
    const hasValidDefault = findDefaultIndex(items, defaultKey) !== null;
    return {
      valid: hasValidDefault,
      value: defaultKey,
    };
  }

  if (!/^\d+$/.test(normalizedAnswer)) {
    return { valid: false };
  }

  const index = Number(normalizedAnswer);
  if (!Number.isInteger(index) || index < 1 || index > items.length) {
    return { valid: false };
  }

  return { valid: true, value: items[index - 1][0] };
}

async function selectOne(rl, title, items, defaultKey) {
  if (!process.stdin.isTTY) {
    return defaultKey;
  }

  const hasValidDefault = findDefaultIndex(items, defaultKey) !== null;
  if (items.length > 0 && supportsInteractiveSelection(rl)) {
    const defaultIndex = hasValidDefault ? findDefaultIndex(items, defaultKey) - 1 : 0;
    return runInteractiveSelection(rl, title, items, {
      activeIndex: defaultIndex,
      helpText: 'Use ↑↓ to move, Enter to confirm.',
      singleSelect: true,
    });
  }

  printChoices(title, items, new Set(defaultKey ? [defaultKey] : []));
  const defaultIndex = findDefaultIndex(items, defaultKey);
  const promptText = defaultIndex
    ? `Choose one item [${defaultIndex}]: `
    : 'Choose one item: ';

  return readRequiredAnswer(rl, promptText, (answer) => {
    const parsedAnswer = parseSingleSelection(answer, items, defaultKey);
    if (parsedAnswer.valid) {
      return parsedAnswer;
    }
    process.stdout.write(`Please enter a number between 1 and ${items.length}.\n`);
    return { valid: false };
  });
}

function parseManySelections(answer, items, defaultKeys) {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) {
    return { valid: true, value: defaultKeys };
  }

  const indexes = normalizedAnswer.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (indexes.length === 0) {
    return { valid: true, value: [] };
  }

  const selectedKeys = [];
  for (const rawIndex of indexes) {
    if (!/^\d+$/.test(rawIndex)) {
      return { valid: false };
    }

    const index = Number.parseInt(rawIndex, 10);
    if (index < 1 || index > items.length) {
      return { valid: false };
    }

    const selectedKey = items[index - 1][0];
    if (!selectedKeys.includes(selectedKey)) {
      selectedKeys.push(selectedKey);
    }
  }

  return { valid: true, value: selectedKeys };
}

function filterValidDefaultKeys(items, defaultKeys) {
  const availableKeys = new Set(items.map(([key]) => key));
  return defaultKeys.filter((key) => availableKeys.has(key));
}

async function selectMany(rl, title, items, defaultKeys = []) {
  const validDefaultKeys = filterValidDefaultKeys(items, defaultKeys);

  if (!process.stdin.isTTY) {
    return validDefaultKeys;
  }

  if (items.length > 0 && supportsInteractiveSelection(rl)) {
    const defaultIndex = validDefaultKeys.length > 0
      ? findDefaultIndex(items, validDefaultKeys[0]) - 1
      : 0;
    return runInteractiveSelection(rl, title, items, {
      activeIndex: defaultIndex >= 0 ? defaultIndex : 0,
      helpText: 'Use ↑↓ to move, space to select, Enter to confirm.',
      selectedKeys: validDefaultKeys,
    });
  }

  printChoices(title, items, new Set(validDefaultKeys));
  const defaultIndexes = validDefaultKeys
    .map((key) => findDefaultIndex(items, key))
    .filter((index) => index !== null);
  const defaultText = defaultIndexes.length > 0 ? ` [${defaultIndexes.join(',')}]` : '';

  return readRequiredAnswer(
    rl,
    `Choose comma-separated items${defaultText}: `,
    (answer) => {
      const parsedAnswer = parseManySelections(answer, items, validDefaultKeys);
      if (parsedAnswer.valid) {
        return parsedAnswer;
      }
      process.stdout.write(`Please enter comma-separated numbers between 1 and ${items.length}.\n`);
      return { valid: false };
    },
  );
}

module.exports = { createRL, confirm, selectOne, selectMany };
