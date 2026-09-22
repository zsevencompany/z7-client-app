const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('replayAPI', {

  // ── Surveillance ──────────────────────────────────────────
  startSurveillance: (replayPath) =>
    ipcRenderer.invoke('start-surveillance', replayPath),

  stopSurveillance: () =>
    ipcRenderer.invoke('stop-surveillance'),

  // ── Callbacks surveillance ────────────────────────────────
  onSurveillanceStatus: (callback) => {
    ipcRenderer.removeAllListeners('surveillance-status');
    ipcRenderer.on('surveillance-status', (_, data) => callback(data));
  },

  onReplayParsed: (callback) => {
    ipcRenderer.removeAllListeners('replay-parsed');
    ipcRenderer.on('replay-parsed', (_, data) => callback(data));
  },

  // ── Fichiers ──────────────────────────────────────────────
  listReplays: (replayPath) =>
    ipcRenderer.invoke('list-replays', replayPath),

  parseReplay: (filePath) =>
    ipcRenderer.invoke('parse-replay', filePath),

  selectFile: () =>
    ipcRenderer.invoke('select-file'),

  selectFolder: () =>
    ipcRenderer.invoke('select-folder'),

  // ── Auto-update ───────────────────────────────────────────
  onUpdateAvailable: (callback) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_, data) => callback(data));
  },

  onUpdateProgress: (callback) => {
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.on('update-progress', (_, data) => callback(data));
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.on('update-downloaded', (_, data) => callback(data));
  },

  installUpdate: () =>
    ipcRenderer.invoke('install-update'),
});