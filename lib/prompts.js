const readline = require('node:readline');
let inquirerPrompts;

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

function isOptionalInquirerLoadError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if (error.code === 'ERR_REQUIRE_ESM') {
    return true;
  }

  if (error.code === 'MODULE_NOT_FOUND') {
    return typeof error.message === 'string'
      && error.message.includes("'@inquirer/prompts'");
  }

  return false;
}

function getInquirerPrompt(name) {
  try {
    inquirerPrompts ||= require('@inquirer/prompts');
  } catch (error) {
    if (isOptionalInquirerLoadError(error)) {
      return null;
    }
    throw error;
  }

  return typeof inquirerPrompts[name] === 'function' ? inquirerPrompts[name] : null;
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

  const selectPrompt = getInquirerPrompt('select');
  const hasValidDefault = findDefaultIndex(items, defaultKey) !== null;
  if (selectPrompt) {
    return selectPrompt({
      message: title,
      choices: items.map(([key, label]) => ({ value: key, name: label })),
      default: hasValidDefault ? defaultKey : undefined,
    }, { clearPromptOnDone: true });
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

  const checkboxPrompt = getInquirerPrompt('checkbox');
  if (checkboxPrompt) {
    const defaultSelection = new Set(validDefaultKeys);
    return checkboxPrompt({
      message: title,
      instructions: true,
      choices: items.map(([key, label]) => ({
        value: key,
        name: label,
        checked: defaultSelection.has(key),
      })),
    }, { clearPromptOnDone: true });
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
