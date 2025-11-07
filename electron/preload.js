const { contextBridge } = require('electron');

// 簡化版 - 應用程式將使用 LocalStorage 模式運行
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: false, // 設為 false，讓應用使用 LocalStorage
  platform: process.platform,
});
