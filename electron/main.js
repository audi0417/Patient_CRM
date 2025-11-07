const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '患者管理系統 - Patient CRM',
    backgroundColor: '#ffffff'
  });

  // 總是載入開發伺服器（目前為開發模式）
  mainWindow.loadURL('http://localhost:8080').catch(() => {
    // 如果 8080 失敗，嘗試 8081
    mainWindow.loadURL('http://localhost:8081');
  });

  // 開啟開發者工具
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
