const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const result = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, '');
    result[key] = value;
  }
  return result;
}

test('src markdown items include required front matter fields', () => {
  const srcDir = path.resolve(__dirname, '..', 'src');
  const markdownFiles = collectMarkdownFiles(srcDir);
  assert.ok(markdownFiles.length > 0);

  for (const file of markdownFiles) {
    const rel = path.relative(srcDir, file).split(path.sep).join('/');
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
      assert.ok(frontMatter.whenToUse, `${rel} is missing whenToUse`);
    }

    if (rel.startsWith('skills/') || rel.includes('/skills/')) {
      assert.ok(frontMatter.whenToUse, `${rel} is missing whenToUse`);
    }

    if (rel.startsWith('capabilities/') && rel.includes('/skills/')) {
      assert.ok(frontMatter.applyTo, `${rel} is missing applyTo`);
    }
  }
});
