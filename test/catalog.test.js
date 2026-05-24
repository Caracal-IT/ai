const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { getSourceCatalog } = require('../cli/catalog');

test('source catalog includes kotlin language best-practices item', () => {
  const catalog = getSourceCatalog(path.resolve(__dirname, '..', 'src'));
  const languageCategory = catalog.categories.find((category) => category.key === 'language');

  assert.ok(languageCategory);

  const kotlinItem = languageCategory.items.find((item) => item.key === 'kotlin');
  assert.ok(kotlinItem);
  assert.deepEqual(kotlinItem.files.instructions, ['kotlin.best-practices.instructions.md']);
});
