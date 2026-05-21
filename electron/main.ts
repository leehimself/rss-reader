import { app, BrowserWindow, ipcMain, shell, nativeImage, Tray, Menu, dialog, Notification, MenuItem } from 'electron';
import path from 'path';
import { unlinkSync, existsSync } from 'fs';
import windowStateKeeper from 'electron-window-state';
import { initialize, gracefulShutdown } from '../server/index.js';
import { dbManager } from '../server/db.js';
import { workerDispatcher } from '../server/workers/worker-dispatcher.js';
import { settingsService } from '../server/settings-service.js';
import { log, setLogDir } from '../server/logger.js';
import { LOG_DIR, getUserDataPath } from '../server/config.js';
import { setupContextMenu } from '../server/context-menu.js';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let expressPort = 3001;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const url = commandLine.pop();
  if (url) handleDeepLink(url);
});

app.on('open-url', (_event, url) => {
  handleDeepLink(url);
});

async function createWindow() {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
    file: 'window-state.json',
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    title: 'RSS Reader',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindowState.manage(mainWindow);

  const vitePort = process.env.VITE_DEV_SERVER_PORT || '5173';

  if (app.isPackaged) {
    mainWindow.loadURL(`http://localhost:${expressPort}/`);
  } else if (process.env.VITE_DEV_SERVER_PORT) {
    mainWindow.loadURL(`http://localhost:${vitePort}/`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${expressPort}/`);
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
    log.error('renderer_load_failed', { errorCode, errorDesc, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('renderer_process_gone', { reason: details.reason, exitCode: details.exitCode });
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  if (process.platform === 'darwin') {
    app.dock?.show();
  }
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'tray-icon.png')
    : path.join(process.cwd(), 'public', 'tray-icon.png');

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('RSS Reader');
  tray.setContextMenu(contextMenu);

  if (!app.isPackaged) {
    contextMenu.append(new MenuItem({ label: 'DevTools', click: () => mainWindow?.webContents.openDevTools() }));
  }
}

function handleDeepLink(url: string) {
  const feedRegex = /^feed:(https?:\/\/.+)$/;
  const match = url.match(feedRegex);
  if (match) {
    mainWindow?.webContents.send('deep-link', match[1]);
  }
}

async function setupIPC() {
  ipcMain.handle('get-express-port', () => expressPort);

  ipcMain.handle('get-ui-state', async (_event, name: string) => {
    try {
      const statePath = path.join(getUserDataPath(), 'ui-state.json');
      if (existsSync(statePath)) {
        const state = JSON.parse(await import('fs').then(fs => fs.readFileSync(statePath, 'utf-8')));
        return state[name] || null;
      }
    } catch {}
    return null;
  });

  ipcMain.handle('set-ui-state', async (_event, name: string, value: string) => {
    try {
      const statePath = path.join(getUserDataPath(), 'ui-state.json');
      let state: Record<string, string> = {};
      if (existsSync(statePath)) {
        state = JSON.parse(await import('fs').then(fs => fs.readFileSync(statePath, 'utf-8')));
      }
      state[name] = value;
      await import('fs').then(fs => fs.writeFileSync(statePath, JSON.stringify(state)));
    } catch {}
  });

  ipcMain.handle('remove-ui-state', async (_event, name: string) => {
    try {
      const statePath = path.join(getUserDataPath(), 'ui-state.json');
      if (existsSync(statePath)) {
        const state = JSON.parse(await import('fs').then(fs => fs.readFileSync(statePath, 'utf-8')));
        delete state[name];
        await import('fs').then(fs => fs.writeFileSync(statePath, JSON.stringify(state)));
      }
    } catch {}
  });

  ipcMain.handle('request-notification-permission', async () => {
    // Notifications don't require explicit permission on Windows
    // On macOS, permission is handled by the Notification API
    return true;
  });

  ipcMain.handle('show-notification', async (_event, title: string, body: string) => {
    const enabled = await settingsService.get('enable_notifications');
    if (!enabled) return;
    new Notification({ title, body }).show();
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('export-pdf', async (_event, _html: string) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export as PDF',
      defaultPath: 'article.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (filePath) {
      await mainWindow!.webContents.printToPDF({
        pageSize: 'A4',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
      });
    }
  });

  ipcMain.handle('open-at-login', async (_event, open: boolean) => {
    app.setLoginItemSettings({ openAtLogin: open });
  });
}

app.whenReady().then(async () => {
  setLogDir(LOG_DIR);
  log.info('app_starting');

  try {
    const { port } = await initialize({ appPath: app.getAppPath(), userDataPath: app.getPath('userData'), isPackaged: app.isPackaged });
    expressPort = port;
  } catch (err) {
    log.error('server_init_failed', { error: (err as Error).message });
  }

  await createWindow();
  createTray();
  await setupIPC();
  setupContextMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async (event) => {
  if (mainWindow) {
    event.preventDefault();
    mainWindow.destroy();
  }
  await gracefulShutdown();
  workerDispatcher.terminate();
  const portFile = '.express-port';
  if (existsSync(portFile)) {
    unlinkSync(portFile);
  }
  app.exit(0);
});

process.on('uncaughtException', (error) => {
  log.error('uncaughtException', { message: error.message, stack: error.stack });
  workerDispatcher.terminate();
  dbManager.gracefulShutdown();
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection', { reason: String(reason) });
});
