import { LOCAL_STORAGE_KEYS } from './local-storage.js';
import { renderHTML } from '../shared/utils/dom-utils.js';
import { WindowedApplication } from '../system/application.js';
import { apps, appClasses } from '../config/apps.js';
import { ICONS } from '../config/icons.js';
import { addDesktopShortcut, removeDesktopShortcut } from './zenfs-utils.js';
import { addToRecycleBin } from './recycle-bin-utils.js';

/**
 * CustomAppService manages the registration and lifecycle of user-created applications.
 */
export class CustomAppService {
  constructor(kernel) {
    this.kernel = kernel;
  }

  get settings() { return this.kernel.use('settings'); }
  get ui() { return this.kernel.use('ui'); }
  get appManager() { return this.kernel.use('appManager'); }
  get shell() { return this.kernel.use('shell'); }

  setupIcons() {
    this.shell.refreshDesktop();
  }

  registerCustomApp(appInfo) {
    const existingApp = apps.find(app => app.id === appInfo.id);

    if (existingApp) {
      existingApp.title = appInfo.title;
      existingApp.width = appInfo.width || 400;
      existingApp.height = appInfo.height || 300;
      if (appInfo.icon) {
        existingApp.icon = { 16: appInfo.icon, 32: appInfo.icon };
      }

      existingApp.appClass = class CustomApp extends WindowedApplication {
        constructor(config) {
          super(config);
        }

        _createWindow() {
          const win = this.kernel.use('ui').createWindow({
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
      this.setupIcons();
      return;
    }

    class CustomApp extends WindowedApplication {
      constructor(config) {
        super(config);
      }

      _createWindow() {
        const win = this.kernel.use('ui').createWindow({
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
          action: () => this.appManager.launchApp(appInfo.id),
        },
        'MENU_DIVIDER',
        {
          label: 'Delete',
          action: () => {
            this.ui.showDialog({
              title: 'Delete App',
              text: `Are you sure you want to delete the app "${appInfo.title}"?`,
              modal: true,
              buttons: [
                {
                  label: 'Yes',
                  action: () => this.deleteCustomApp(appInfo.id),
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
    this.setupIcons();
  }

  deleteCustomApp(appId) {
    const appIndex = apps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;

    const app = apps[appIndex];
    addToRecycleBin(app);

    apps.splice(appIndex, 1);
    delete appClasses[appId];

    removeDesktopShortcut(appId);

    const savedApps = this.settings.get(LOCAL_STORAGE_KEYS.CUSTOM_APPS) || [];
    const newSavedApps = savedApps.filter(savedApp => savedApp.id !== appId);
    this.settings.set(LOCAL_STORAGE_KEYS.CUSTOM_APPS, newSavedApps);

    this.setupIcons();
  }
}
