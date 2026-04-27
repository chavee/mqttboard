'use strict';

const { spawnSync } = require('child_process');

const platformArgs = {
  darwin: '--mac',
  win32: '--win',
  linux: '--linux'
};

const archArgs = {
  arm64: '--arm64',
  x64: '--x64',
  ia32: '--ia32'
};

const platformArg = platformArgs[process.platform];
const archArg = archArgs[process.arch];

if (platformArg == null) {
  console.error(`Unsupported platform for desktop build: ${process.platform}`);
  process.exit(1);
}

if (archArg == null) {
  console.error(`Unsupported architecture for desktop build: ${process.arch}`);
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['electron-builder', platformArg, archArg, '--publish', 'never'],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

process.exit(result.status == null ? 1 : result.status);
