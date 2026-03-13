import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, Menu, ipcMain, dialog, webUtils, session } = require('electron');
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const Store = require('electron-store');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    title: "Windows 98 Web Edition",
    icon: path.join(__dirname, '../public/src/assets/icons/windows-4.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Native Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          role: 'togglefullscreen'
        },
        {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            role: 'toggleDevTools'
        }
      ]
    },
    {
      label: 'Devices',
      submenu: [
        {
          label: 'Insert Floppy (A:)...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'Floppy Images/Archives', extensions: ['img', 'ima', 'zip'] }],
              title: 'Select Floppy Content'
            });
            if (!result.canceled) {
              const handle = await webUtils.getFileSystemAccessHandle(result.filePaths[0]);
              mainWindow.webContents.postMessage('device-inserted', { type: 'floppy', handle, name: path.basename(result.filePaths[0]) });
            }
          }
        },
        {
          label: 'Insert CD (D:)...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'CD Images/Archives', extensions: ['iso', 'zip'] }],
              title: 'Select CD Content'
            });
            if (!result.canceled) {
              const handle = await webUtils.getFileSystemAccessHandle(result.filePaths[0]);
              mainWindow.webContents.postMessage('device-inserted', { type: 'cd', handle, name: path.basename(result.filePaths[0]) });
            }
          }
        },
        {
          label: 'Insert Removable Disk...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Folder to Mount'
            });
            if (!result.canceled) {
              const handle = await webUtils.getFileSystemAccessHandle(result.filePaths[0]);
              mainWindow.webContents.postMessage('device-inserted', { type: 'removable', handle, name: path.basename(result.filePaths[0]) });
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Windows 98 Web Edition',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Windows 98 Web Edition',
              message: 'Windows 98 Web Edition',
              detail: 'An ultimate pixel-perfect browser-based recreation attempt of Windows 98.\n\nVersion: ' + app.getVersion() + '\n\nRunning in Electron.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle shutdown screen properly - the app should not quit automatically
  mainWindow.on('close', (e) => {
    // If we wanted to prevent close, we would do it here.
    // But user wants to be able to close the app via Electron.
  });
}

app.whenReady().then(() => {
  console.log('Electron Version:', process.versions.electron);
  if (!webUtils) {
    console.error('CRITICAL: electron.webUtils is undefined. File system access will be restricted.');
  }

  // Intercept /win98-web/ paths to support hardcoded absolute paths in Electron
  // Also handle /src/ paths for dev mode if needed
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*/win98-web/*', 'file:///win98-web/*'] },
    (details, callback) => {
      const url = details.url;
      if (url.includes('/win98-web/')) {
        const index = url.indexOf('/win98-web/');
        const relativePart = url.substring(index + '/win98-web/'.length);
        let newUrl;
        if (process.env.VITE_DEV_SERVER_URL) {
          newUrl = new URL(relativePart, process.env.VITE_DEV_SERVER_URL).toString();
        } else {
          const basePath = path.join(__dirname, '..');
          newUrl = pathToFileURL(path.join(basePath, 'dist', relativePart)).toString();
        }
        callback({ redirectURL: newUrl });
      } else {
        callback({});
      }
    }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select C: Drive Folder'
  });
  if (result.canceled) return null;
  const folderPath = result.filePaths[0];
  store.set('cDrivePath', folderPath);
  return folderPath;
});

ipcMain.handle('get-c-drive-path', () => {
  return store.get('cDrivePath');
});

ipcMain.on('request-c-drive-handle', async (event) => {
  let cDrivePath = store.get('cDrivePath');
  if (!cDrivePath) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select C: Drive Folder'
    });
    if (result.canceled) {
      event.sender.postMessage('c-drive-handle', null);
      return;
    }
    cDrivePath = result.filePaths[0];
    store.set('cDrivePath', cDrivePath);
  }

  try {
    const handle = await webUtils.getFileSystemAccessHandle(cDrivePath);
    event.sender.postMessage('c-drive-handle', handle);
  } catch (error) {
    console.error('Failed to get FileSystemAccessHandle:', error);
    event.sender.postMessage('c-drive-handle', null);
  }
});

ipcMain.handle('is-electron', () => true);
