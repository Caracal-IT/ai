#!/usr/bin/env node

const path = require('node:path');

function printUsage() {
  console.log([
    '',
    'Usage:',
    '  npx github:Caracal-IT/ai init [target-directory]',
    '  npx github:Caracal-IT/ai generate [target-directory]',
    '  npx github:Caracal-IT/ai update [target-directory]',
    '',
    'Commands:',
    '  init      Scaffold a new AI workspace (runs the interactive wizard)',
    '  generate  Regenerate .github/ from .ai/',
    '  update    Update selections and recopy into .ai/ + .github/',
    '',
  ].join('\n'));
}

async function main(argv = process.argv.slice(2)) {
  const [command, rawTarget = '.'] = argv;
  const targetDir = path.resolve(process.cwd(), rawTarget);

  switch (command) {
    case 'init':
    case 'setup': {
      if (command === 'setup') {
        console.warn('⚠  "setup" is deprecated – use "init" instead.');
      }
      const { init } = require('../cli/init');
      const result = await init(targetDir);
      console.log(`\n✔  AI workspace ready at ${targetDir}`);
      console.log(`   Created  ${result.created.length} file(s).`);
      if (result.skipped.length > 0) {
        console.log(`   Skipped existing ${result.skipped.length} file(s).`);
      }
      return 0;
    }

    case 'generate': {
      const { sync } = require('../cli/sync');
      const result = await sync(targetDir);
      console.log(`\n✔  .github/ regenerated from .ai/ at ${targetDir}`);
      console.log(`   Written ${result.created.length} file(s).`);
      return 0;
    }

    case 'update': {
      const { update } = require('../cli/update');
      const result = await update(targetDir);
      console.log(`\n✔  AI selections updated at ${targetDir}`);
      console.log(`   Written ${result.created.length} file(s).`);
      return 0;
    }

    default:
      printUsage();
      return command ? 1 : 0;
  }
}

module.exports = { main };

if (require.main === module) {
  main().then((exitCode) => {
    process.exit(exitCode);
  }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
