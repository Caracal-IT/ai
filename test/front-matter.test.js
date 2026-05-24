const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parseFrontMatter } = require('../test-helpers/front-matter');

function collectMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(abs);
    }
  }
  return files;
}

test('src markdown items include required front matter fields', () => {
  const srcDir = path.resolve(__dirname, '..', 'src');
  const markdownFiles = collectMarkdownFiles(srcDir);
  assert.ok(markdownFiles.length > 0);

  for (const file of markdownFiles) {
    const rel = path.relative(srcDir, file).split(path.sep).join('/');
    const parts = rel.split('/');

    // Skip template files nested inside skill folders
    if (rel.includes('/skills/') && parts.includes('templates')) continue;

    const content = fs.readFileSync(file, 'utf8');
    const frontMatter = parseFrontMatter(content);

    assert.ok(frontMatter, `${rel} is missing front matter`);
    assert.ok(frontMatter.name, `${rel} is missing name`);
    assert.ok(frontMatter.description, `${rel} is missing description`);
    assert.match(
      frontMatter.name,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${rel} has invalid name format: ${frontMatter.name}`,
    );

    if (rel.startsWith('instructions/') || rel.includes('/instructions/')) {
      assert.ok(frontMatter.applyTo, `${rel} is missing applyTo`);
      if (!rel.endsWith('.instruction.md') && !rel.endsWith('.instructions.md')) {
        assert.ok(frontMatter.whenToUse, `${rel} is missing whenToUse`);
      }
    }

    if (rel.startsWith('skills/') || rel.includes('/skills/')) {
      assert.ok(frontMatter.whenToUse, `${rel} is missing whenToUse`);
      // For folder-based skills (SKILL.md), the expected name is the parent folder name
      const basename = path.posix.basename(rel).toLowerCase();
      const expected = basename === 'skill.md'
        ? path.posix.basename(path.posix.dirname(rel))
        : path.posix.parse(rel).name;
      assert.equal(
        frontMatter.name,
        expected,
        `${rel} front matter name must match skill folder/file name: ${expected}`,
      );
    }

    if (rel.startsWith('capabilities/') && rel.includes('/skills/')) {
      assert.ok(frontMatter.applyTo, `${rel} is missing applyTo`);
    }
  }
});
