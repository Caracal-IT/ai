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

function findDefaultIndex(items, defaultKey) {
  const defaultIndex = items.findIndex(([key]) => key === defaultKey);
  return defaultIndex >= 0 ? defaultIndex + 1 : null;
}

function parseSingleSelection(answer, items, defaultKey) {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) {
    return {
      valid: defaultKey !== undefined,
      value: defaultKey,
    };
  }

  const index = Number.parseInt(normalizedAnswer, 10);
  if (!Number.isInteger(index) || index < 1 || index > items.length) {
    return { valid: false };
  }

  return { valid: true, value: items[index - 1][0] };
}

async function selectOne(rl, title, items, defaultKey) {
  if (!process.stdin.isTTY) {
    return defaultKey;
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
    const index = Number.parseInt(rawIndex, 10);
    if (!Number.isInteger(index) || index < 1 || index > items.length) {
      return { valid: false };
    }

    const selectedKey = items[index - 1][0];
    if (!selectedKeys.includes(selectedKey)) {
      selectedKeys.push(selectedKey);
    }
  }

  return { valid: true, value: selectedKeys };
}

async function selectMany(rl, title, items, defaultKeys = []) {
  if (!process.stdin.isTTY) {
    return defaultKeys;
  }

  printChoices(title, items, new Set(defaultKeys));
  const defaultIndexes = defaultKeys
    .map((key) => findDefaultIndex(items, key))
    .filter((index) => index !== null);
  const defaultText = defaultIndexes.length > 0 ? ` [${defaultIndexes.join(',')}]` : '';

  return readRequiredAnswer(
    rl,
    `Choose comma-separated items${defaultText}: `,
    (answer) => {
      const parsedAnswer = parseManySelections(answer, items, defaultKeys);
      if (parsedAnswer.valid) {
        return parsedAnswer;
      }
      process.stdout.write(`Please enter comma-separated numbers between 1 and ${items.length}.\n`);
      return { valid: false };
    },
  );
}

module.exports = { createRL, confirm, selectOne, selectMany };
