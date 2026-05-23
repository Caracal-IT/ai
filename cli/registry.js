const https = require('node:https');
const { CAPABILITIES } = require('../lib/templates');

const REGISTRY_BASE =
  'https://raw.githubusercontent.com/Caracal-IT/ai/main/src/skills';

/**
 * Attempt to fetch a skill file from the GitHub registry.
 * Returns the text content or null on failure.
 *
 * @param {string} capabilityKey
 * @returns {Promise<string|null>}
 */
function fetchRemoteSkill(capabilityKey) {
  return new Promise((resolve) => {
    const url = `${REGISTRY_BASE}/${capabilityKey}.md`;
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) { resolve(null); return; }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', () => resolve(null));
      })
      .on('error', () => resolve(null));
  });
}

/**
 * Resolve skills for the given capability keys.
 * Tries the remote registry first; falls back to local generation.
 *
 * Returns a map of  capabilityKey → markdownContent.
 *
 * @param {string[]} capabilityKeys
 * @param {string} typeKey  – project type key used for local fallback generation
 * @param {Function} localGenerator  – (capKey, typeKey) => string
 * @returns {Promise<Map<string, string>>}
 */
async function resolveSkills(capabilityKeys, typeKey, localGenerator) {
  const result = new Map();

  for (const key of capabilityKeys) {
    const remote = await fetchRemoteSkill(key);
    if (remote) {
      result.set(key, remote);
    } else {
      result.set(key, localGenerator(key, typeKey));
    }
  }

  return result;
}

/** Return all known capability keys. */
function allCapabilityKeys() {
  return CAPABILITIES.map((c) => c.key);
}

module.exports = { resolveSkills, allCapabilityKeys, fetchRemoteSkill };
