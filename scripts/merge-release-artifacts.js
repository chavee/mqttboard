'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const sourceDir = path.resolve(process.argv[2] || 'release-artifacts');
const outputDir = path.resolve(process.argv[3] || 'release');
const macMetadataName = 'latest-mac.yml';

function listFiles(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dirPath, entry.name));
}

function copyArtifact(sourcePath, destinationPath) {
  if (fs.existsSync(destinationPath)) {
    const source = fs.readFileSync(sourcePath);
    const existing = fs.readFileSync(destinationPath);
    if (!source.equals(existing)) {
      throw new Error('Conflicting release artifact: ' + path.basename(destinationPath));
    }
    return;
  }
  fs.copyFileSync(sourcePath, destinationPath);
}

function mergeMacMetadata(metadataFiles) {
  const metadata = metadataFiles.map((filePath) => yaml.load(fs.readFileSync(filePath, 'utf8')));
  const version = metadata[0].version;
  const combined = Object.assign({}, metadata[0], { files: [] });
  const seenUrls = new Set();

  metadata.forEach((item) => {
    if (item.version !== version) {
      throw new Error('macOS update metadata has inconsistent versions.');
    }
    (item.files || []).forEach((file) => {
      if (!seenUrls.has(file.url)) {
        seenUrls.add(file.url);
        combined.files.push(file);
      }
    });
  });

  combined.files.sort((left, right) => left.url.localeCompare(right.url));
  const preferredFile = combined.files.find((file) => !file.url.includes('arm64')) || combined.files[0];
  combined.path = preferredFile.url;
  combined.sha512 = preferredFile.sha512;

  return yaml.dump(combined, { lineWidth: -1, noRefs: true });
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error('Source directory does not exist: ' + sourceDir);
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const macMetadataFiles = [];
  fs.readdirSync(sourceDir, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }

    listFiles(path.join(sourceDir, entry.name)).forEach((sourcePath) => {
      if (path.basename(sourcePath) === macMetadataName) {
        macMetadataFiles.push(sourcePath);
        return;
      }
      copyArtifact(sourcePath, path.join(outputDir, path.basename(sourcePath)));
    });
  });

  if (macMetadataFiles.length > 0) {
    fs.writeFileSync(path.join(outputDir, macMetadataName), mergeMacMetadata(macMetadataFiles));
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
