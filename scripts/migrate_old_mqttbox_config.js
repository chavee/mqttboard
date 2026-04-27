#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, session } = require('electron');

const ROOT_DIR = path.resolve(__dirname, '..');
const BRIDGE_HTML_PATH = path.join(ROOT_DIR, 'src', 'www', 'index.html');
const DEFAULT_OLD_SESSION_PATH = path.join(
  os.homedir(),
  'Library',
  'Containers',
  'com.workswithweb.mqttbox',
  'Data',
  'Library',
  'Application Support',
  'MQTTBox'
);
const DEFAULT_NEW_SESSION_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'MQTTBoard'
);
const DEFAULT_EXPORT_PATH = path.join(ROOT_DIR, 'old_mqtt_config.json');

const STORE_CONFIG = [
  { key: 'clients', dbName: 'MQTT_CLIENT_SETTINGS', keyField: 'mcsId' },
  { key: 'loads', dbName: 'MQTT_LOAD_SETTINGS', keyField: 'mcsId' },
  { key: 'folders', dbName: 'MQTT_FOLDER_SETTINGS', keyField: 'folderId' }
];

function parseArgs(argv) {
  const options = {
    oldSessionPath: DEFAULT_OLD_SESSION_PATH,
    newSessionPath: DEFAULT_NEW_SESSION_PATH,
    exportPath: DEFAULT_EXPORT_PATH,
    mode: 'migrate'
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--export-only') {
      options.mode = 'export';
    } else if (arg === '--import-only') {
      options.mode = 'import';
    } else if (arg === '--old-session-path') {
      options.oldSessionPath = path.resolve(argv[++i]);
    } else if (arg === '--new-session-path') {
      options.newSessionPath = path.resolve(argv[++i]);
    } else if (arg === '--export-path') {
      options.exportPath = path.resolve(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log('Usage: electron scripts/migrate_old_mqttbox_config.js [options]');
  console.log('');
  console.log('Modes:');
  console.log('  default        export old config and import into the new session path');
  console.log('  --export-only  export only');
  console.log('  --import-only  import from the exported JSON file only');
  console.log('');
  console.log('Options:');
  console.log('  --old-session-path <path>  old MQTTBox session directory');
  console.log('  --new-session-path <path>  target session directory for this app');
  console.log('  --export-path <path>       JSON snapshot path');
}

function ensureExists(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(label + ' not found: ' + dirPath);
  }
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function withHiddenWindow(sessionPath, workFn) {
  fs.mkdirSync(sessionPath, { recursive: true });

  const customSession = session.fromPath(sessionPath);
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      session: customSession,
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  try {
    await win.loadURL('file://' + BRIDGE_HTML_PATH);
    return await workFn(win);
  } finally {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
}

async function readStoresFromSession(sessionPath) {
  return withHiddenWindow(sessionPath, async (win) => {
    const source = `
      (async function() {
        const localforage = require('localforage');
        const stores = ${JSON.stringify(STORE_CONFIG)};
        const result = {};

        for (const store of stores) {
          const db = localforage.createInstance({
            name: store.dbName,
            driver: localforage.INDEXEDDB
          });
          const items = [];
          await db.iterate(function(value) {
            items.push(value);
          });
          result[store.key] = items;
        }

        return result;
      })();
    `;

    return win.webContents.executeJavaScript(source, true);
  });
}

async function writeStoresToSession(sessionPath, payload) {
  return withHiddenWindow(sessionPath, async (win) => {
    const source = `
      (async function() {
        const localforage = require('localforage');
        const stores = ${JSON.stringify(STORE_CONFIG)};
        const payload = ${JSON.stringify(payload)};
        const summary = {};

        for (const store of stores) {
          const db = localforage.createInstance({
            name: store.dbName,
            driver: localforage.INDEXEDDB
          });
          const items = Array.isArray(payload[store.key]) ? payload[store.key] : [];
          let written = 0;

          for (const item of items) {
            if (!item || item[store.keyField] == null) {
              continue;
            }
            await db.setItem(item[store.keyField], item);
            written++;
          }

          summary[store.key] = written;
        }

        return summary;
      })();
    `;

    return win.webContents.executeJavaScript(source, true);
  });
}

function normalizeExportData(data, sourcePath) {
  const normalized = {
    clients: Array.isArray(data.clients) ? data.clients : [],
    loads: Array.isArray(data.loads) ? data.loads : [],
    folders: Array.isArray(data.folders) ? data.folders : [],
    extractedAt: new Date().toISOString(),
    source: sourcePath
  };

  normalized.clients = normalized.clients.map((client) => {
    const copy = Object.assign({}, client);
    if (!Array.isArray(copy.publishSettings)) {
      copy.publishSettings = [];
    }
    if (!Array.isArray(copy.subscribeSettings)) {
      copy.subscribeSettings = [];
    }
    return copy;
  });

  return normalized;
}

function readExportFile(exportPath) {
  return JSON.parse(fs.readFileSync(exportPath, 'utf8'));
}

function writeExportFile(exportPath, data) {
  ensureParentDir(exportPath);
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
}

function printSummary(label, data) {
  console.log(label);
  console.log('  clients:', Array.isArray(data.clients) ? data.clients.length : 0);
  console.log('  loads:  ', Array.isArray(data.loads) ? data.loads.length : 0);
  console.log('  folders:', Array.isArray(data.folders) ? data.folders.length : 0);
}

async function exportOldConfig(options) {
  ensureExists(options.oldSessionPath, 'Old MQTTBox session path');
  const rawData = await readStoresFromSession(options.oldSessionPath);
  const normalized = normalizeExportData(rawData, options.oldSessionPath);
  writeExportFile(options.exportPath, normalized);
  printSummary('Exported old MQTTBox config:', normalized);
  console.log('  file:   ', options.exportPath);
  return normalized;
}

async function importConfig(options, data) {
  const summary = await writeStoresToSession(options.newSessionPath, data);
  console.log('Imported config into new session:');
  console.log('  clients:', summary.clients || 0);
  console.log('  loads:  ', summary.loads || 0);
  console.log('  folders:', summary.folders || 0);
  console.log('  target: ', options.newSessionPath);
  return summary;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'export') {
    await exportOldConfig(options);
    return;
  }

  if (options.mode === 'import') {
    const data = readExportFile(options.exportPath);
    await importConfig(options, data);
    return;
  }

  const data = await exportOldConfig(options);
  await importConfig(options, data);
}

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error.stack || error.message || error);
    app.exit(1);
  });
