const { createRL, confirm, selectOne, selectMany } = require('../lib/prompts');
const { PROJECT_TYPES, PROJECT_TYPE_KEYS } = require('../lib/project-type');
const { CAPABILITIES } = require('../lib/templates');

const CATEGORIES = [
  ['backend',     'Backend API'],
  ['frontend',    'Frontend App'],
  ['fullstack',   'Full-stack App'],
  ['cli',         'CLI Tool'],
  ['library',     'Library'],
  ['microservice','Microservice'],
];

const ARCHITECTURES = [
  ['clean',      'Clean Architecture'],
  ['layered',    'Layered'],
  ['modular',    'Modular Monolith'],
  ['microservices', 'Microservices'],
  ['minimal',    'Minimal'],
];

const TESTING_STRATEGIES = [
  ['unit-integration', 'Unit + Integration'],
  ['unit',             'Unit only'],
  ['full-pyramid',     'Full pyramid'],
];

const LOGGING_STRATEGIES = [
  ['structured',    'Structured logging'],
  ['basic',         'Basic logs'],
  ['observability', 'Observability (OpenTelemetry)'],
];

/**
 * Run the full 5-step init wizard.
 *
 * @param {string} detectedType  – auto-detected project type key
 * @returns {Promise<{
 *   projectType: string,
 *   category: string,
 *   architecture: string,
 *   testing: string,
 *   logging: string,
 *   capabilities: string[],
 * }>}
 */
async function runWizard(detectedType) {
  const rl = createRL();

  try {
    /* ── Step 1 + 2: Confirm or choose project type ─────────────────────── */
    let projectType = detectedType;

    if (process.stdin.isTTY) {
      if (detectedType !== 'empty') {
        const detected = PROJECT_TYPES[detectedType];
        console.log(`\nDetected: ${detected.label}\n`);
        const ok = await confirm(rl, 'Is this correct?', true);
        if (!ok) projectType = null;
      }

      if (!projectType) {
        const typeItems = PROJECT_TYPE_KEYS.map((k) => [k, PROJECT_TYPES[k].label]);
        projectType = await selectOne(rl, 'What type of project is this?', typeItems, 'empty');
      }
    }

    /* ── Step 3: Project category ───────────────────────────────────────── */
    const category = await selectOne(
      rl,
      'What type of project is this?',
      CATEGORIES,
      'backend',
    );

    /* ── Step 4: Required settings ──────────────────────────────────────── */
    const architecture = await selectOne(
      rl,
      'Architecture:',
      ARCHITECTURES,
      'clean',
    );

    const testing = await selectOne(
      rl,
      'Testing:',
      TESTING_STRATEGIES,
      'unit-integration',
    );

    const logging = await selectOne(
      rl,
      'Logging:',
      LOGGING_STRATEGIES,
      'structured',
    );

    /* ── Step 5: Optional capabilities ─────────────────────────────────── */
    const capItems = CAPABILITIES.map(({ key, label }) => [key, label]);
    const capabilities = await selectMany(
      rl,
      'Select capabilities (optional skills from registry):',
      capItems,
      [],
    );

    return { projectType, category, architecture, testing, logging, capabilities };
  } finally {
    rl.close();
  }
}

module.exports = { runWizard };
