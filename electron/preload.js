const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getCDrivePath: () => ipcRenderer.invoke('get-c-drive-path'),
  isElectron: () => ipcRenderer.invoke('is-electron'),
  onDeviceInserted: (callback) => ipcRenderer.on('device-inserted', (event, data) => callback(data)),
  requestCDriveHandle: () => ipcRenderer.send('request-c-drive-handle'),
  onCDriveHandle: (callback) => ipcRenderer.on('c-drive-handle', (event, handle) => callback(handle)),
});
