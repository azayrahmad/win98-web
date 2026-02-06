import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { renderHTML } from '../shared/utils/dom-utils.js';
import { Application } from '../system/application.js';
import { apps, appClasses } from '../config/apps.js';
import { ICONS } from '../config/icons.js';
import { addDesktopShortcut, removeDesktopShortcut } from './zenfs-utils.js';
import { launchApp } from './app-manager.js';
import { addToRecycleBin } from './recycle-bin-utils.js';

export function setupIcons(): void {
    const desktop = document.querySelector('.desktop') as any;
    if (desktop && typeof desktop.refreshIcons === 'function') {
        desktop.refreshIcons();
    }
}

export interface CustomAppInfo {
    id: string;
    title: string;
    width?: number;
    height?: number;
    icon?: string;
    html: string;
}

export function registerCustomApp(appInfo: CustomAppInfo): void {
    const existingApp = apps.find(app => app.id === appInfo.id) as any;

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
            constructor(config: any) {
                super(config);
            }

            async _createWindow() {
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
        (appClasses as any)[appInfo.id] = existingApp.appClass;
        setupIcons();
        return;
    }

    class CustomApp extends Application {
        constructor(config: any) {
            super(config);
        }

        async _createWindow() {
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

    const newApp: any = {
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
                                action: () => {},
                            },
                        ],
                    });
                },
            },
        ],
    };

    addDesktopShortcut(appInfo.id, appInfo.title);

    apps.push(newApp);
    (appClasses as any)[appInfo.id] = newApp.appClass;
    setupIcons();
}

export function deleteCustomApp(appId: string): void {
    const appIndex = apps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;

    const app = apps[appIndex];
    addToRecycleBin(app);

    apps.splice(appIndex, 1);
    delete (appClasses as any)[appId];

    removeDesktopShortcut(appId);

    const savedApps = (getItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS) as CustomAppInfo[]) || [];
    const newSavedApps = savedApps.filter(savedApp => savedApp.id !== appId);
    setItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS, newSavedApps);

    setupIcons();
}
