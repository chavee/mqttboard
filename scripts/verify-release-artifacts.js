'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMBINED_NAME = 'SHA256SUMS.txt';
const PART_PREFIX = 'SHA256SUMS-';
const MERGED_UPDATE_METADATA = new Set(['latest-mac.yml']);

function isChecksumFile(fileName) {
  return fileName === COMBINED_NAME || fileName.startsWith(PART_PREFIX);
}

function listArtifacts(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !isChecksumFile(entry.name) && entry.name !== '.DS_Store')
    .map((entry) => entry.name)
    .sort();
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function parseChecksumFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line);
      if (match == null) {
        console.error(`Malformed checksum line in ${filePath}: ${line}`);
        process.exit(1);
      }
      return { sha256: match[1].toLowerCase(), name: path.basename(match[2]) };
    });
}

function formatChecksumFile(entries) {
  return entries
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => `${entry.sha256}  ${entry.name}`)
    .join('\n') + '\n';
}

async function hashDirectory(dirPath) {
  const entries = [];
  for (const name of listArtifacts(dirPath)) {
    entries.push({ name, sha256: await hashFile(path.join(dirPath, name)) });
  }
  return entries;
}

// write <dir> <label>: record checksums of everything the build produced.
async function commandWrite(dirPath, label) {
  if (!label) {
    console.error('Usage: verify-release-artifacts.js write <dir> <label>');
    process.exit(1);
  }

  const entries = await hashDirectory(dirPath);
  if (entries.length === 0) {
    console.error(`No release artifacts found in ${dirPath}`);
    process.exit(1);
  }

  // GitHub rewrites release asset names, turning spaces into dots, so an
  // artifact named here can never be found again once it is uploaded.
  const unsafe = entries.filter((entry) => !/^[A-Za-z0-9._-]+$/.test(entry.name));
  if (unsafe.length > 0) {
    console.error('Artifact names must use only letters, digits, dot, dash and underscore:');
    unsafe.forEach((entry) => console.error(`  ${entry.name}`));
    process.exit(1);
  }

  const outputPath = path.join(dirPath, `${PART_PREFIX}${label}.txt`);
  fs.writeFileSync(outputPath, formatChecksumFile(entries));
  console.log(`Wrote ${entries.length} checksum(s) to ${path.basename(outputPath)}`);
  entries.forEach((entry) => console.log(`  ${entry.sha256}  ${entry.name}`));
}

// check <dir>: re-hash downloaded artifacts against the per-platform checksum
// files, then collapse them into a single SHA256SUMS.txt.
async function commandCheck(dirPath) {
  const partNames = fs.readdirSync(dirPath)
    .filter((name) => name.startsWith(PART_PREFIX))
    .sort();

  if (partNames.length === 0) {
    console.error(`No ${PART_PREFIX}*.txt files found in ${dirPath}. Build jobs did not publish checksums.`);
    process.exit(1);
  }

  const expected = new Map();
  for (const partName of partNames) {
    for (const entry of parseChecksumFile(path.join(dirPath, partName))) {
      // macOS metadata is merged from Intel and Apple Silicon builds after
      // each platform checksum file is written.
      if (MERGED_UPDATE_METADATA.has(entry.name)) {
        continue;
      }
      const previous = expected.get(entry.name);
      if (previous != null && previous.sha256 !== entry.sha256) {
        console.error(`Conflicting checksums for ${entry.name}: ${previous.sha256} (${previous.source}) vs ${entry.sha256} (${partName})`);
        process.exit(1);
      }
      expected.set(entry.name, { sha256: entry.sha256, source: partName });
    }
  }

  for (const name of MERGED_UPDATE_METADATA) {
    const filePath = path.join(dirPath, name);
    if (fs.existsSync(filePath)) {
      expected.set(name, { sha256: await hashFile(filePath), source: 'merged update metadata' });
    }
  }

  const actualNames = listArtifacts(dirPath);
  const failures = [];

  for (const [name, entry] of expected) {
    const filePath = path.join(dirPath, name);
    if (!fs.existsSync(filePath)) {
      failures.push(`${name}: missing after artifact download (expected ${entry.sha256} from ${entry.source})`);
      continue;
    }

    const actual = await hashFile(filePath);
    if (actual !== entry.sha256) {
      failures.push(`${name}: corrupted in transit. built ${entry.sha256}, downloaded ${actual}`);
      continue;
    }

    console.log(`OK ${entry.sha256}  ${name}`);
  }

  for (const name of actualNames) {
    if (!expected.has(name)) {
      failures.push(`${name}: present in ${dirPath} but no build job claimed it`);
    }
  }

  if (failures.length > 0) {
    console.error('Release artifact verification failed:');
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exit(1);
  }

  const combined = Array.from(expected, ([name, entry]) => ({ name, sha256: entry.sha256 }));
  fs.writeFileSync(path.join(dirPath, COMBINED_NAME), formatChecksumFile(combined));
  partNames.forEach((partName) => fs.rmSync(path.join(dirPath, partName)));
  console.log(`Verified ${combined.length} artifact(s) and wrote ${COMBINED_NAME}`);
}

// verify <sumsFile> <dir>: confirm what GitHub actually serves matches what we uploaded.
async function commandVerify(sumsFile, dirPath) {
  const expected = parseChecksumFile(sumsFile);
  const failures = [];

  for (const entry of expected) {
    const filePath = path.join(dirPath, entry.name);
    if (!fs.existsSync(filePath)) {
      failures.push(`${entry.name}: not downloaded back from the release`);
      continue;
    }

    const actual = await hashFile(filePath);
    if (actual !== entry.sha256) {
      const size = fs.statSync(filePath).size;
      failures.push(`${entry.name}: release asset does not match upload. expected ${entry.sha256}, got ${actual} (${size} bytes downloaded)`);
      continue;
    }

    console.log(`OK ${entry.sha256}  ${entry.name}`);
  }

  if (failures.length > 0) {
    console.error('Uploaded release assets are corrupted:');
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exit(1);
  }

  console.log(`Verified ${expected.length} uploaded release asset(s)`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'write':
      await commandWrite(path.resolve(args[0] || 'release'), args[1]);
      break;
    case 'check':
      await commandCheck(path.resolve(args[0] || 'release'));
      break;
    case 'verify':
      await commandVerify(path.resolve(args[0]), path.resolve(args[1]));
      break;
    default:
      console.error('Usage: verify-release-artifacts.js <write|check|verify> ...');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
