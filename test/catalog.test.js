const assert = require('node:assert/strict');
const fs = require('node:fs');
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

test('source catalog excludes removed legacy root directories', () => {
  const srcRoot = path.resolve(__dirname, '..', 'src');
  const catalog = getSourceCatalog(srcRoot);

  assert.equal(fs.existsSync(path.join(srcRoot, 'instructions')), false);
  assert.equal(fs.existsSync(path.join(srcRoot, 'skills')), false);
  assert.equal(fs.existsSync(path.join(srcRoot, 'agents')), false);
  assert.equal(catalog.categories.some((category) => category.key === 'instructions'), false);
  assert.equal(catalog.categories.some((category) => category.key === 'skills'), false);
  assert.equal(catalog.categories.some((category) => category.key === 'agents'), false);
});

test('source catalog includes required starter files', () => {
  const catalog = getSourceCatalog(path.resolve(__dirname, '..', 'src'));

  assert.deepEqual(catalog.required.instructions, ['ai-instructions.md']);
  assert.deepEqual(catalog.required.agents, []);
  assert.deepEqual(catalog.required.skills, [
    'feature-documentation/SKILL.md',
    'feature-documentation/templates/feature.template.md',
    'real-work/SKILL.md',
  ]);
});
