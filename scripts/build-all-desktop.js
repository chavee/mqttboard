'use strict';

const { spawnSync } = require('child_process');

const buildTargets = [
  ['--mac', 'dmg', '--arm64'],
  ['--mac', 'dmg', '--x64'],
  ['--win', 'nsis', '--x64'],
  ['--linux', 'AppImage', '--x64']
];

for (const targetArgs of buildTargets) {
  const result = spawnSync(
    'npx',
    ['electron-builder'].concat(targetArgs, ['--publish', 'never']),
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );

  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}
