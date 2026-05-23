#!/usr/bin/env node

const path = require('node:path');
const { setupEnvironment } = require('../lib/setup');

function printUsage() {
  console.log('Usage: ai setup [target-directory]');
}

async function main(argv = process.argv.slice(2)) {
  const [command, targetDirectory = '.'] = argv;

  if (command !== 'setup') {
    printUsage();
    return command ? 1 : 0;
  }

  const targetDir = path.resolve(process.cwd(), targetDirectory);
  const result = setupEnvironment(targetDir);

  console.log(`AI environment ready at ${targetDir}`);
  console.log(`Created ${result.created.length} file(s).`);

  if (result.skipped.length > 0) {
    console.log(`Skipped existing ${result.skipped.length} file(s).`);
  }

  return 0;
}

module.exports = {
  main,
};

if (require.main === module) {
  main().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
