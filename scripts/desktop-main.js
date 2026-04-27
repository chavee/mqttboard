'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');

const BUILD_INDEX_PATH = path.join(__dirname, '..', 'build', 'index.html');
const BRIDGE_HTML_PATH = path.join(__dirname, '..', 'build', 'config-bridge.html');
const APP_ICON_PATH = path.join(__dirname, '..', 'build', 'images', 'icon-128.png');
const MQTT_CLIENT_WORKER_PATH = path.join(__dirname, 'desktop-mqtt-client-worker.js');
const DEFAULT_CONFIG_FILE_NAME = 'mqttboard-config.json';
const SERVICE_TYPE_MQTT_CLIENTS = 'SERVICE_TYPE_MQTT_CLIENTS';
const ACTION_MQTT_CLIENT_CONNECT = 'ACTION_MQTT_CLIENT_CONNECT';
const ACTION_MQTT_CLIENT_DISCONNECT = 'ACTION_MQTT_CLIENT_DISCONNECT';
const ACTION_PUBLISH_MESSAGE = 'ACTION_PUBLISH_MESSAGE';
const ACTION_SUBSCRIBE_TO_TOPIC = 'ACTION_SUBSCRIBE_TO_TOPIC';
const ACTION_UN_SUBSCRIBE_TO_TOPIC = 'ACTION_UN_SUBSCRIBE_TO_TOPIC';
const STORE_CONFIG = [
  { key: 'clients', dbName: 'MQTT_CLIENT_SETTINGS', keyField: 'mcsId' },
  { key: 'loads', dbName: 'MQTT_LOAD_SETTINGS', keyField: 'mcsId' },
  { key: 'folders', dbName: 'MQTT_FOLDER_SETTINGS', keyField: 'folderId' }
];

let mainWindow = null;
let mqttClientWorkerMap = {};

function broadcastToAllWindows(channel, payload) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  });
}

function stopMqttClientWorker(mcsId) {
  const worker = mqttClientWorkerMap[mcsId];
  if (worker != null) {
    worker.kill();
    delete mqttClientWorkerMap[mcsId];
  }
}

function stopAllMqttClientWorkers() {
  Object.keys(mqttClientWorkerMap).forEach((mcsId) => {
    stopMqttClientWorker(mcsId);
  });
}

function getOrCreateMqttClientWorker(mcsId) {
  let worker = mqttClientWorkerMap[mcsId];
  if (worker != null) {
    return worker;
  }

  worker = childProcess.fork(MQTT_CLIENT_WORKER_PATH, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });
  worker.on('message', (eventObj) => {
    broadcastToAllWindows(SERVICE_TYPE_MQTT_CLIENTS, eventObj);
    if (eventObj != null && eventObj.event === 'EVENT_MQTT_CLIENT_CONNECTION_CLOSED') {
      stopMqttClientWorker(mcsId);
    }
  });
  worker.on('exit', () => {
    // Only delete if this worker is still the current one in the map,
    // otherwise a newer worker may have already replaced it
    if (mqttClientWorkerMap[mcsId] === worker) {
      delete mqttClientWorkerMap[mcsId];
    }
  });
  mqttClientWorkerMap[mcsId] = worker;
  return worker;
}

function handleMqttClientAction(event, action) {
  if (action == null) {
    return;
  }

  if (action.actionType === ACTION_MQTT_CLIENT_CONNECT && action.data != null && action.data.mcsId != null) {
    getOrCreateMqttClientWorker(action.data.mcsId).send(action);
  } else if (action.actionType === ACTION_MQTT_CLIENT_DISCONNECT && action.data != null) {
    const worker = mqttClientWorkerMap[action.data];
    if (worker != null) {
      // Remove from map immediately so a subsequent connect creates a fresh worker
      delete mqttClientWorkerMap[action.data];
      // Ask the worker to disconnect gracefully
      worker.send(action);
      // Force-kill after a short timeout in case the worker hangs
      // (e.g. mqtt client.end() callback never fires during error/reconnecting state)
      const forceKillTimer = setTimeout(function () {
        try { worker.kill(); } catch (e) { /* already exited */ }
      }, 3000);
      worker.once('exit', function () {
        clearTimeout(forceKillTimer);
      });
    }
  } else if (
    (action.actionType === ACTION_PUBLISH_MESSAGE ||
      action.actionType === ACTION_SUBSCRIBE_TO_TOPIC ||
      action.actionType === ACTION_UN_SUBSCRIBE_TO_TOPIC) &&
    action.data != null &&
    action.data.mcsId != null
  ) {
    const worker = mqttClientWorkerMap[action.data.mcsId];
    if (worker != null) {
      worker.send(action);
    }
  }
}

function getDefaultConfigPath() {
  return path.join(app.getPath('documents'), DEFAULT_CONFIG_FILE_NAME);
}

function normalizeConfigData(data, sourcePath) {
  const normalized = {
    clients: Array.isArray(data && data.clients) ? data.clients : [],
    loads: Array.isArray(data && data.loads) ? data.loads : [],
    folders: Array.isArray(data && data.folders) ? data.folders : [],
    extractedAt: new Date().toISOString(),
    source: sourcePath || app.getPath('userData')
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

function requireMainWindow() {
  if (mainWindow == null || mainWindow.isDestroyed()) {
    throw new Error('Main window is not available.');
  }
  return mainWindow;
}

async function withBridgeWindow(workFn) {
  const parentWindow = requireMainWindow();
  const bridgeWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      session: parentWindow.webContents.session,
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  try {
    await bridgeWindow.loadURL('file://' + BRIDGE_HTML_PATH);
    return await workFn(bridgeWindow);
  } finally {
    if (!bridgeWindow.isDestroyed()) {
      bridgeWindow.destroy();
    }
  }
}

async function readConfigSnapshot() {
  const rawData = await withBridgeWindow(async (bridgeWindow) => {
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

    return bridgeWindow.webContents.executeJavaScript(source, true);
  });

  return normalizeConfigData(rawData, app.getPath('userData'));
}

function parseImportFile(filePath) {
  let payload;

  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error('Invalid JSON file.');
  }

  if (payload == null || typeof payload !== 'object') {
    throw new Error('Invalid config format.');
  }

  return normalizeConfigData(payload, filePath);
}

async function writeConfigSnapshot(payload) {
  const normalized = normalizeConfigData(payload, payload && payload.source ? payload.source : app.getPath('userData'));

  const summary = await withBridgeWindow(async (bridgeWindow) => {
    const source = `
      (async function() {
        const localforage = require('localforage');
        const stores = ${JSON.stringify(STORE_CONFIG)};
        const payload = ${JSON.stringify(normalized)};
        const summary = {};

        for (const store of stores) {
          const db = localforage.createInstance({
            name: store.dbName,
            driver: localforage.INDEXEDDB
          });
          const items = Array.isArray(payload[store.key]) ? payload[store.key] : [];
          let written = 0;

          await db.clear();

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

    return bridgeWindow.webContents.executeJavaScript(source, true);
  });

  return { payload: normalized, summary: summary };
}

function formatSummary(summary) {
  return [
    'Clients: ' + (summary.clients || 0),
    'Loads: ' + (summary.loads || 0),
    'Folders: ' + (summary.folders || 0)
  ].join('\n');
}

async function exportConfigToJson() {
  const parentWindow = requireMainWindow();
  const result = await dialog.showSaveDialog(parentWindow, {
    title: 'Export MQTTBoard config',
    defaultPath: getDefaultConfigPath(),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (result.canceled || !result.filePath) {
    return;
  }

  const config = await readConfigSnapshot();
  fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2));

  await dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: 'Export complete',
    message: 'MQTTBoard config exported successfully.',
    detail: result.filePath + '\n\n' + formatSummary(config)
  });
}

async function importConfigFromJson() {
  const parentWindow = requireMainWindow();
  const result = await dialog.showOpenDialog(parentWindow, {
    title: 'Import MQTTBoard config',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return;
  }

  const imported = parseImportFile(result.filePaths[0]);
  const writeResult = await writeConfigSnapshot(imported);

  await dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: 'Import complete',
    message: 'MQTTBoard config imported successfully.',
    detail: result.filePaths[0] + '\n\n' + formatSummary(writeResult.summary) + '\n\nThe app will now reload.'
  });

  parentWindow.reload();
}

async function runMenuAction(action) {
  try {
    await action();
  } catch (error) {
    dialog.showErrorBox('MQTTBoard config error', error.stack || error.message || String(error));
  }
}

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  template.push({
    label: 'File',
    submenu: [
      {
        label: 'Export Config JSON',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: function() {
          runMenuAction(exportConfigToJson);
        }
      },
      {
        label: 'Import Config JSON',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: function() {
          runMenuAction(importConfigFromJson);
        }
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  });

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  });

  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Documentation',
        click: function() {
          shell.openExternal('http://workswithweb.com/html/mqttbox/getstarted.html');
        }
      },
      {
        label: 'Download Apps',
        click: function() {
          shell.openExternal('http://workswithweb.com/html/mqttbox/downloads.html');
        }
      }
    ]
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  if (!fs.existsSync(BUILD_INDEX_PATH)) {
    dialog.showErrorBox(
      'Missing build assets',
      'Expected build/index.html. Build the web assets before starting the desktop app.'
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    icon: fs.existsSync(APP_ICON_PATH) ? APP_ICON_PATH : undefined,
    title: 'MQTTBoard',
    webPreferences: {
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildApplicationMenu();
  mainWindow.loadFile(BUILD_INDEX_PATH);
}

app.whenReady().then(() => {
  ipcMain.on(SERVICE_TYPE_MQTT_CLIENTS, handleMqttClientAction);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopAllMqttClientWorkers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
