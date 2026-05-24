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

module.exports = { parseFrontMatter };
