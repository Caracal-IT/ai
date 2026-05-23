const readline = require('node:readline');

/**
 * Create a readline interface bound to the process stdio.
 */
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a yes/no question.  Returns defaultValue immediately in non-TTY mode.
 */
function confirm(rl, question, defaultValue = true) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(defaultValue);
      return;
    }
    const hint = defaultValue ? '[Y/n]' : '[y/N]';
    rl.question(`${question} ${hint} `, (answer) => {
      const t = answer.trim().toLowerCase();
      resolve(t === '' ? defaultValue : t === 'y' || t === 'yes');
    });
  });
}

/**
 * Present a numbered single-choice menu.  Returns the chosen key.
 * Falls back to defaultKey in non-TTY mode.
 *
 * @param {readline.Interface} rl
 * @param {string} title
 * @param {Array<[string, string]>} items  – [key, label] pairs
 * @param {string} defaultKey
 */
function selectOne(rl, title, items, defaultKey) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(defaultKey);
      return;
    }

    console.log(`\n${title}`);
    items.forEach(([key, label], i) => {
      const marker = key === defaultKey ? '(*)' : '( )';
      console.log(`  ${marker} ${i + 1}) ${label}`);
    });
    console.log('');

    rl.question('Enter number (or press Enter for default): ', (answer) => {
      const t = answer.trim();
      if (t === '') { resolve(defaultKey); return; }
      const idx = parseInt(t, 10) - 1;
      if (idx >= 0 && idx < items.length) {
        resolve(items[idx][0]);
      } else {
        console.log('  Invalid selection – using default.');
        resolve(defaultKey);
      }
    });
  });
}

/**
 * Present a numbered multi-choice checkbox menu.  Returns array of chosen keys.
 * Falls back to defaultKeys in non-TTY mode.
 *
 * @param {readline.Interface} rl
 * @param {string} title
 * @param {Array<[string, string]>} items  – [key, label] pairs
 * @param {string[]} defaultKeys
 */
function selectMany(rl, title, items, defaultKeys = []) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(defaultKeys);
      return;
    }

    const selected = new Set(defaultKeys);

    function printMenu() {
      console.log(`\n${title}`);
      items.forEach(([key, label], i) => {
        const marker = selected.has(key) ? '[x]' : '[ ]';
        console.log(`  ${marker} ${i + 1}) ${label}`);
      });
      console.log('\n  Type number(s) to toggle, "a" = all, "n" = none, or Enter to confirm.');
    }

    function ask() {
      printMenu();
      rl.question('> ', (answer) => {
        const t = answer.trim().toLowerCase();
        if (t === '') { resolve([...selected]); return; }
        if (t === 'a') { items.forEach(([k]) => selected.add(k)); ask(); return; }
        if (t === 'n') { selected.clear(); ask(); return; }

        t.split(/[\s,]+/).forEach((part) => {
          const idx = parseInt(part, 10) - 1;
          if (idx >= 0 && idx < items.length) {
            const [key] = items[idx];
            if (selected.has(key)) selected.delete(key);
            else selected.add(key);
          }
        });
        ask();
      });
    }

    ask();
  });
}

module.exports = { createRL, confirm, selectOne, selectMany };
