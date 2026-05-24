const {
  confirm: inquirerConfirm,
  select,
  checkbox,
} = require('@inquirer/prompts');

function createRL() {
  return {
    close() {},
  };
}

async function confirm(_rl, question, defaultValue = true) {
  if (!process.stdin.isTTY) {
    return defaultValue;
  }

  return inquirerConfirm({
    message: question,
    default: defaultValue,
  });
}

async function selectOne(_rl, title, items, defaultKey) {
  if (!process.stdin.isTTY) {
    return defaultKey;
  }

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
