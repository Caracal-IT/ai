const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { parseFrontMatter } = require('../test-helpers/front-matter');

test('required feature documentation skill describes the requested workflow and inline template', () => {
  const file = path.resolve(
    __dirname,
    '..',
    'src',
    'required',
    'skills',
    'feature-documentation.md',
  );
  const content = fs.readFileSync(file, 'utf8');
  const frontMatter = parseFrontMatter(content);

  assert.ok(frontMatter);
  assert.equal(frontMatter.name, 'feature-documentation');
  assert.match(frontMatter.whenToUse, /create a feature/i);
  assert.match(frontMatter.whenToUse, /change feature/i);
  assert.match(content, /Confirm the request was understood/i);
  assert.match(content, /ask for it before creating the feature file/i);
  assert.match(content, /optional sub-category/i);
  assert.match(content, /docs\/<category>\/<feature-name>\.feature\.md/);
  assert.match(content, /docs\/<category>\/<sub-category>\/<feature-name>\.feature\.md/);
  assert.match(content, /## Default Template/);
  assert.match(content, /# <Feature Title>/);
  assert.match(content, /## Summary/);
  assert.match(content, /## User Expectations/);
  assert.match(content, /## Acceptance Criteria/);
  assert.match(content, /always end the file with `\.feature\.md`/);
});

test('feature documentation template example lives in a standalone markdown file', () => {
  const file = path.resolve(
    __dirname,
    '..',
    'templates',
    'feature-documentation',
    'feature-template.feature.md',
  );
  const content = fs.readFileSync(file, 'utf8');

  assert.match(content, /^# <Feature Title>/);
  assert.match(content, /## Summary/);
  assert.match(content, /## User Expectations/);
  assert.match(content, /## Acceptance Criteria/);
});
