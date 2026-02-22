import { START_MENU_PATH } from '../shell/start-menu/start-menu-utils.js';
import { apps } from '../config/apps.js';

const STARTUP_APPS_KEY = "startup_apps";
const STARTUP_PATH = `${START_MENU_PATH}/StartUp`;

/**
 * StartupService manages applications that run automatically when the OS boots.
 */
export class StartupService {
  constructor(kernel) {
    this.kernel = kernel;
  }

  get file() { return this.kernel.use('file'); }
  get settings() { return this.kernel.use('settings'); }

  async getStartupApps() {
    const appIds = new Set();

    try {
      if (await this.file.exists(STARTUP_PATH)) {
        const files = await this.file.listDirectory(STARTUP_PATH);
        for (const file of files) {
          if (file.endsWith(".lnk.json")) {
            const content = await this.file.readText(`${STARTUP_PATH}/${file}`);
            const data = JSON.parse(content);
            if (data.appId) {
              appIds.add(data.appId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to read startup apps from ZenFS", error);
    }

    const localApps = this.settings.get(STARTUP_APPS_KEY) || [];
    localApps.forEach(id => appIds.add(id));

    return Array.from(appIds);
  }

  async addStartupApp(appId) {
    try {
      if (!(await this.file.exists(STARTUP_PATH))) {
        await this.file.makeDirectory(STARTUP_PATH);
      }
      const app = apps.find(a => a.id === appId);
      const label = app ? app.title : appId;
      const lnkPath = `${STARTUP_PATH}/${label}.lnk.json`;

      if (!(await this.file.exists(lnkPath))) {
        await this.file.writeText(lnkPath, JSON.stringify({
          type: "shortcut",
          appId: appId,
        }, null, 2));
      }
    } catch (error) {
      console.error("Failed to add startup app to ZenFS", error);
    }

    const currentApps = this.settings.get(STARTUP_APPS_KEY) || [];
    if (!currentApps.includes(appId)) {
      const newApps = [...currentApps, appId];
      this.settings.set(STARTUP_APPS_KEY, newApps);
    }
  }

  async removeStartupApp(appId) {
    try {
      if (await this.file.exists(STARTUP_PATH)) {
        const files = await this.file.listDirectory(STARTUP_PATH);
        for (const file of files) {
          if (file.endsWith(".lnk.json")) {
            const content = await this.file.readText(`${STARTUP_PATH}/${file}`);
            const data = JSON.parse(content);
            if (data.appId === appId) {
              await this.file.deleteFile(`${STARTUP_PATH}/${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to remove startup app from ZenFS", error);
    }

    const currentApps = this.settings.get(STARTUP_APPS_KEY) || [];
    const newApps = currentApps.filter((id) => id !== appId);
    this.settings.set(STARTUP_APPS_KEY, newApps);
  }
}
