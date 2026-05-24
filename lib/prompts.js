let promptsModulePromise;

async function loadPrompts() {
  if (!promptsModulePromise) {
    promptsModulePromise = import('@inquirer/prompts');
  }

  return promptsModulePromise;
}

function createRL() {
  return {
    close() {},
  };
}

async function confirm(_rl, question, defaultValue = true) {
  if (!process.stdin.isTTY) {
    return defaultValue;
  }

  const { confirm: inquirerConfirm } = await loadPrompts();

  return inquirerConfirm({
    message: question,
    default: defaultValue,
  });
}

async function selectOne(_rl, title, items, defaultKey) {
  if (!process.stdin.isTTY) {
    return defaultKey;
  }

  const { select } = await loadPrompts();

  return select({
    message: title,
    choices: items.map(([key, label]) => ({
      name: label,
      value: key,
    })),
    default: defaultKey,
  });
}

async function selectMany(_rl, title, items, defaultKeys = []) {
  if (!process.stdin.isTTY) {
    return defaultKeys;
  }

  const { checkbox } = await loadPrompts();

  return checkbox({
    message: title,
    choices: items.map(([key, label]) => ({
      name: label,
      value: key,
      checked: defaultKeys.includes(key),
    })),
    pageSize: 12,
  });
}

module.exports = { createRL, confirm, selectOne, selectMany };
