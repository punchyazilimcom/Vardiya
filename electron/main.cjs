// Electron ana süreç — Başak Vardiya masaüstü (Windows .exe)
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const DEV = process.env.ELECTRON_DEV === '1';

function pencereOlustur() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0D0D0D',
    autoHideMenuBar: true,
    title: 'Başak Vardiya',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (DEV) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Dış bağlantıları tarayıcıda aç
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  pencereOlustur();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) pencereOlustur();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
