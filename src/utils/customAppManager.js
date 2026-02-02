import { getItem, setItem, LOCAL_STORAGE_KEYS } from './localStorage.js';
import { ShowDialogWindow } from '../components/DialogWindow.js';
import { renderHTML } from './domUtils.js';
import { Application } from '../apps/Application.js';
import { ICONS } from '../config/icons.js';
import { addDesktopShortcut, removeDesktopShortcut } from './directory.js';
import { launchApp } from './appManager.js';
import { addToRecycleBin } from './recycleBinManager.js';

export function setupIcons() {
    document.dispatchEvent(new CustomEvent("desktop-refresh"));
}

export async function registerCustomApp(appInfo) {
    const { apps, appClasses } = await import('../config/apps.js');
    const existingApp = apps.find(app => app.id === appInfo.id);

    if (existingApp) {
        // Update existing app's properties
        existingApp.title = appInfo.title;
        existingApp.width = appInfo.width || 400;
        existingApp.height = appInfo.height || 300;
        if (appInfo.icon) {
            existingApp.icon = { 16: appInfo.icon, 32: appInfo.icon };
        }
        // Re-create the app class to capture the new HTML content in the closure
        existingApp.appClass = class CustomApp extends Application {
            constructor(config) {
                super(config);
            }

            _createWindow() {
                const win = new $Window({
                    title: this.title,
                    outerWidth: this.width,
                    outerHeight: this.height,
                    resizable: true,
                    icons: this.icon,
                });
                renderHTML(win.$content[0], appInfo.html);
                return win;
            }
        };
        appClasses[appInfo.id] = existingApp.appClass;
        setupIcons();
        return;
    }

    class CustomApp extends Application {
        constructor(config) {
            super(config);
        }

        _createWindow() {
            const win = new $Window({
                title: this.title,
                outerWidth: this.width || 400,
                outerHeight: this.height || 300,
                resizable: true,
                icons: this.icon,
            });
            renderHTML(win.$content[0], appInfo.html);
            return win;
        }
    }

    const newApp = {
        id: appInfo.id,
        title: appInfo.title,
        icon: appInfo.icon ? { 16: appInfo.icon, 32: appInfo.icon } : ICONS.appmaker,
        appClass: CustomApp,
        width: appInfo.width || 400,
        height: appInfo.height || 300,
        resizable: true,
        contextMenu: [
            {
                label: 'Open',
                action: () => launchApp(appInfo.id),
            },
            'MENU_DIVIDER',
            {
                label: 'Delete',
                action: () => {
                    ShowDialogWindow({
                        title: 'Delete App',
                        text: `Are you sure you want to delete the app "${appInfo.title}"?`,
                        modal: true,
                        buttons: [
                            {
                                label: 'Yes',
                                action: () => deleteCustomApp(appInfo.id),
                                isDefault: true,
                            },
                            {
                                label: 'No',
                            },
                        ],
                    });
                },
            },
        ],
    };

    addDesktopShortcut(appInfo.id, appInfo.title);

    apps.push(newApp);
    appClasses[appInfo.id] = newApp.appClass;
    setupIcons();
}

export async function deleteCustomApp(appId) {
    const { apps, appClasses } = await import('../config/apps.js');
    const appIndex = apps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;

    const app = apps[appIndex];
    addToRecycleBin(app);

    apps.splice(appIndex, 1);
    delete appClasses[appId];

    removeDesktopShortcut(appId);

    const savedApps = getItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS) || [];
    const newSavedApps = savedApps.filter(savedApp => savedApp.id !== appId);
    setItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS, newSavedApps);

    setupIcons();
}
