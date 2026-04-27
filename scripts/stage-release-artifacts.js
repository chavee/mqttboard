'use strict';

const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(process.argv[2] || 'dist');
const outputDir = path.resolve(process.argv[3] || 'release');

const releaseFilePattern = /\.(dmg|zip|exe|appimage|deb|rpm|snap|blockmap|yml|yaml)$/i;
const ignoredNames = new Set([
  '.DS_Store',
  'builder-debug.yml',
  'builder-effective-config.yaml'
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(sourcePath, destinationPath) {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function shouldInclude(fileName) {
  return !ignoredNames.has(fileName) && releaseFilePattern.test(fileName);
}

function stageArtifacts() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory does not exist: ${sourceDir}`);
    process.exit(1);
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const copiedFiles = [];

  for (const entry of entries) {
    if (!entry.isFile() || !shouldInclude(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(outputDir, entry.name);
    copyFile(sourcePath, destinationPath);
    copiedFiles.push(entry.name);
  }

  if (copiedFiles.length === 0) {
    console.error(`No release artifacts found in ${sourceDir}`);
    process.exit(1);
  }

  copiedFiles.sort().forEach((fileName) => {
    console.log(fileName);
  });
}

stageArtifacts();
