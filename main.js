const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// ── FIX : parser hors de l'asar quand packagé ──────────────────
const PARSER_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'parser', 'net8.0')
  : path.join(__dirname, 'parser', 'net8.0');

const PARSER_EXE = path.join(PARSER_DIR, 'FortniteReplayParser.exe');

function log(emoji, msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  console.log(`[${time}] ${emoji}  ${msg}`);
}

// ══════════════════════════════════════════════════════════════
//  AUTO-UPDATE
// ══════════════════════════════════════════════════════════════

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  const logPath = path.join(app.getPath('userData'), 'update-log.txt');
  function logUpdate(msg) {
    const line = new Date().toISOString() + ' ' + msg + '\n';
    fs.appendFileSync(logPath, line);
    log('🔄', msg);
  }

  autoUpdater.autoDownload         = true;
  autoUpdater.autoInstallOnAppQuit = false;
  logUpdate('setupAutoUpdater lancé');

  autoUpdater.on('checking-for-update',  () => logUpdate('checking-for-update'));
  autoUpdater.on('update-not-available', () => logUpdate('update-not-available'));
  autoUpdater.on('error', (err)          => logUpdate('ERROR: ' + err.message));

  autoUpdater.on('update-available', (info) => {
    log('🆕', `Mise à jour disponible : v${info.version}`);
    mainWindow?.webContents.send('update-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    if (pct % 20 === 0) log('📥', `Téléchargement : ${pct}%`);
    mainWindow?.webContents.send('update-progress', { percent: pct });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log('✅', `Mise à jour v${info.version} téléchargée — prête à installer`);
    mainWindow?.webContents.send('update-downloaded', { version: info.version });
  });

  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
}

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ══════════════════════════════════════════════════════════════
//  FENÊTRE PRINCIPALE
// ══════════════════════════════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1000, minHeight: 600,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'LOGO-Z7-V2.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ══════════════════════════════════════════════════════════════
//  SURVEILLANCE
// ══════════════════════════════════════════════════════════════

let watchInterval    = null;
let surveillancePath = '';
let isParsing        = false;
let lastParsedFile   = '';
let trackedFile      = null;

const CHECK_INTERVAL     = 2000;
const GROWTH_TIMEOUT     = 40000;
const PAUSE_BEFORE_FINAL = 20000;
const STABLE_FINAL       = 20000;

ipcMain.handle('start-surveillance', async (event, replayPath) => {
  try {
    const rawPath = replayPath ||
      'C:\\Users\\' + (process.env.USERNAME || 'User') +
      '\\AppData\\Local\\FortniteGame\\Saved\\Demos';

    surveillancePath = rawPath.replace(/%([^%]+)%/g, (_, key) => process.env[key] || _);

    if (!fs.existsSync(surveillancePath)) {
      return { success: false, error: `Dossier introuvable: ${surveillancePath}` };
    }

    trackedFile = null; lastParsedFile = ''; isParsing = false;

    log('🟢', `Surveillance démarrée — dossier: ${surveillancePath}`);
    log('👀', 'En attente d\'une nouvelle partie Fortnite...');

    watchInterval = setInterval(() => checkReplays(event), CHECK_INTERVAL);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('stop-surveillance', async () => {
  if (watchInterval) { clearInterval(watchInterval); watchInterval = null; }
  trackedFile = null; isParsing = false;
  log('🔴', 'Surveillance arrêtée');
  return { success: true };
});

function checkReplays(event) {
  if (isParsing) return;
  try {
    if (!fs.existsSync(surveillancePath)) return;

    const files = fs.readdirSync(surveillancePath)
      .filter(f => f.endsWith('.replay'))
      .map(f => {
        const fullPath = path.join(surveillancePath, f);
        const stat = fs.statSync(fullPath);
        return { name: f, path: fullPath, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) return;

    const latest = files[0];
    if (latest.name === lastParsedFile) return;

    const now = Date.now();

    // Nouveau fichier détecté
    if (!trackedFile || trackedFile.name !== latest.name) {
      log('📂', `Nouveau fichier détecté: ${latest.name} (${(latest.size / 1024).toFixed(0)} KB)`);
      log('⏳', 'En attente de croissance du fichier pour confirmer la partie...');
      trackedFile = {
        name: latest.name, path: latest.path,
        size: latest.size, firstSeenAt: now,
        growing: false, stableSince: null, finalStableSince: null,
      };
      return;
    }

    // Le fichier grossit → partie en cours
    if (latest.size > trackedFile.size) {
      const growth = latest.size - trackedFile.size;
      if (!trackedFile.growing) {
        log('🎮', `PARTIE DÉTECTÉE ! Le fichier grossit (+${(growth/1024).toFixed(0)} KB) → Écriture en cours`);
        trackedFile.growing = true;
      } else {
        log('✍️ ', `Écriture en cours... taille: ${(latest.size/1024).toFixed(0)} KB (+${(growth/1024).toFixed(0)} KB)`);
      }
      trackedFile.size = latest.size;
      trackedFile.stableSince = null;
      trackedFile.finalStableSince = null;
      event.sender.send('surveillance-status', { status: 'reading', replayName: latest.name, size: latest.size });
      return;
    }

    // Le fichier ne grossit plus
    if (trackedFile.growing) {
      if (!trackedFile.stableSince) {
        trackedFile.stableSince = now;
        trackedFile.finalStableSince = null;
        log('⏸️ ', 'Pause détectée — vérification silencieuse');
      }

      const pauseFor = now - trackedFile.stableSince;

      if (!trackedFile.finalStableSince) {
        if (pauseFor >= PAUSE_BEFORE_FINAL) {
          trackedFile.finalStableSince = now;
          log('⏱️ ', 'Stabilisation finale — 20s supplémentaires pour confirmer fin de partie');
          event.sender.send('surveillance-status', { status: 'stabilizing', replayName: latest.name });
        }
      } else {
        const finalFor   = now - trackedFile.finalStableSince;
        const remaining  = Math.ceil((STABLE_FINAL - finalFor) / 1000);
        if (finalFor % 6000 < 2000) log('⏱️ ', `Stabilisation finale... encore ${remaining}s`);

        if (finalFor >= STABLE_FINAL) {
          log('📖', 'Fin de partie confirmée ! Lancement du parsing...');
          event.sender.send('surveillance-status', { status: 'parsing', replayName: latest.name });
          isParsing = true;
          clearInterval(watchInterval); watchInterval = null;
          runParser(trackedFile.path, trackedFile.name, event);
        }
      }
    } else {
      // Fichier apparu mais jamais grandi → timeout
      const waitedFor = now - trackedFile.firstSeenAt;
      if (waitedFor >= GROWTH_TIMEOUT) {
        log('⚠️ ', `${latest.name} — aucune croissance après ${GROWTH_TIMEOUT/1000}s, fichier ignoré`);
        lastParsedFile = latest.name; trackedFile = null;
        log('👀', 'En attente d\'une nouvelle partie Fortnite...');
      }
    }
  } catch (e) {
    log('❌', `Erreur surveillance: ${e.message}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  PARSER C#
// ══════════════════════════════════════════════════════════════

function runParser(filePath, fileName, event) {
  return new Promise((resolve) => {

    // Vérifier que le parser existe
    if (!fs.existsSync(PARSER_EXE)) {
      log('❌', `Parser introuvable: ${PARSER_EXE}`);
      const err = { success: false, error: 'FortniteReplayParser.exe introuvable', replayName: fileName, players: [] };
      event?.sender.send('replay-parsed', err);
      resolve(err);
      return;
    }

    log('⚙️ ', `Parser C# lancé sur: ${fileName}`);
    log('📁', `Parser path: ${PARSER_EXE}`);

    let stdout = '', stderr = '';

    const proc = spawn(PARSER_EXE, [filePath], { cwd: PARSER_DIR });

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => {
      stderr += d.toString();
      const line = d.toString().trim();
      if (line) log('📋', `[Parser] ${line}`);
    });

    proc.on('close', (code) => {
      log('✅', `Parser terminé (code: ${code})`);
      try {
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          log('🏆', `Parsing réussi ! ${result.totalPlayers || result.players?.length || 0} joueurs trouvés`);
        } else {
          log('❌', `Parsing échoué: ${result.error}`);
        }
        event?.sender.send('replay-parsed', { ...result, replayName: fileName });
        afterParsing(fileName, event);
        resolve(result);
      } catch (e) {
        log('❌', `Erreur lecture résultats: ${e.message}`);
        const err = { success: false, error: `Parse error: ${e.message}`, replayName: fileName, players: [] };
        event?.sender.send('replay-parsed', err);
        afterParsing(fileName, event);
        resolve(err);
      }
    });

    proc.on('error', (e) => {
      log('❌', `Erreur lancement parser: ${e.message}`);
      const err = { success: false, error: e.message, replayName: fileName, players: [] };
      event?.sender.send('replay-parsed', err);
      afterParsing(fileName, event);
      resolve(err);
    });
  });
}

function afterParsing(fileName, event) {
  lastParsedFile = fileName; trackedFile = null; isParsing = false;
  log('👀', 'En attente d\'une nouvelle partie Fortnite...');
  setTimeout(() => {
    if (!watchInterval) watchInterval = setInterval(() => checkReplays(event), CHECK_INTERVAL);
  }, 3000);
}

// ══════════════════════════════════════════════════════════════
//  IPC — DIVERS
// ══════════════════════════════════════════════════════════════

ipcMain.handle('parse-replay', async (event, filePath) =>
  runParser(filePath, path.basename(filePath), null)
);

ipcMain.handle('list-replays', async (event, replayPath) => {
  try {
    if (!fs.existsSync(replayPath)) return [];
    return fs.readdirSync(replayPath)
      .filter(f => f.endsWith('.replay'))
      .map(f => {
        const p = path.join(replayPath, f);
        const s = fs.statSync(p);
        return { name: f, path: p, size: s.size, mtime: s.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) { return []; }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Sélectionner un replay Fortnite',
    filters: [{ name: 'Replay Fortnite', extensions: ['replay'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return { success: false };
  return { success: true, filePath: result.filePaths[0] };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Sélectionner le dossier des replays',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return { success: false };
  return { success: true, path: result.filePaths[0] };
});