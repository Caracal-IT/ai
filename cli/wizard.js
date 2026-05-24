const { createRL, confirm, selectOne, selectMany } = require('../lib/prompts');
const { PROJECT_TYPES, PROJECT_TYPE_KEYS } = require('../lib/project-type');

/**
 * Run folder-driven init/update wizard.
 *
 * @param {string} detectedType
 * @param {{ categories: Array<{ key: string, label: string, items: Array<{ key: string, label: string }> }> }} catalog
 * @param {{ selections?: Record<string, string[]> }} [defaults]
 */
async function runWizard(detectedType, catalog, defaults = {}) {
  const rl = createRL();

  try {
    let projectType = detectedType;

    if (process.stdin.isTTY) {
      if (detectedType !== 'empty') {
        const detected = PROJECT_TYPES[detectedType];
        console.log(`\nDetected: ${detected.label}\n`);
        const ok = await confirm(rl, 'Is this project type correct?', true);
        if (!ok) projectType = null;
      }

      if (!projectType) {
        const typeItems = PROJECT_TYPE_KEYS.map((k) => [k, PROJECT_TYPES[k].label]);
        projectType = await selectOne(rl, 'Select project type', typeItems, 'empty');
      }
    }

    const selections = {};
    for (const category of (catalog.categories || [])) {
      const defaultKeys = defaults.selections?.[category.key] || [];
      const selectedSet = new Set(defaultKeys);
      const items = category.items.map((item) => {
        const installed = selectedSet.has(item.key) ? ' (installed)' : '';
        return [item.key, `${item.label}${installed}`];
      });

      selections[category.key] = await selectMany(
        rl,
        `Select ${category.label} items`,
        items,
        defaultKeys,
      );
    }

    return { projectType, selections };
  } finally {
    rl.close();
  }
}

module.exports = { runWizard };
