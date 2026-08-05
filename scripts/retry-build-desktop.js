'use strict';

const { spawn } = require('child_process');

const maxAttempts = 3;
const retryDelayMs = 15000;

function runBuild() {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(command, ['run', 'build:desktop'], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log('Retrying desktop build in ' + (retryDelayMs / 1000) + ' seconds (attempt ' + attempt + ' of ' + maxAttempts + ').');
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    if (await runBuild()) {
      return;
    }
  }

  process.exit(1);
}

main();
