import { apps } from '../config/apps.js';
import {
  requestWaitState,
  releaseWaitState,
} from './busy-state-manager.js';
import { openApps } from '../system/application.js';
import { playSound } from './sound-manager.js';

export class AppManager {
  constructor() {
    this.runningApps = {};
  }

  getRunningApps() {
    return this.runningApps;
  }

  isProcessRunning(appId) {
    return Object.values(this.runningApps).some(app => app.id === appId);
  }

  getAppConfig(appId) {
    return apps.find((a) => a.id === appId);
  }

  closeApp(instanceKey) {
    const appInstance = this.runningApps[instanceKey];
    if (appInstance) {
      playSound("Close");
      // Remove the app from the registries first to prevent re-entry.
      delete this.runningApps[instanceKey];
      openApps.delete(instanceKey);
      document.dispatchEvent(
        new CustomEvent("app-closed", {
          detail: { appId: appInstance.id, instanceKey },
        }),
      );

      // Now, perform the app-specific cleanup.
      if (appInstance.win) {
        appInstance.win.close(true); // Force close without firing onClosed.
      } else if (typeof appInstance._cleanup === "function") {
        appInstance._cleanup(); // For non-windowed apps.
      }
    }
  }

  async launchApp(appId, data = null) {
    const launchId = `launch-${appId}-${Date.now()}`;
    requestWaitState(launchId);

    const appConfig = this.getAppConfig(appId);
    playSound("Open");
    if (!appConfig) {
      console.error(`No application config found for ID: ${appId}`);
      releaseWaitState(launchId);
      return;
    }

    try {
      if (appConfig.appClass) {
        let AppClass = appConfig.appClass;

        // Handle lazy loading if appClass is a loader function
        if (typeof AppClass === "function" && !AppClass.prototype) {
          const module = await AppClass();
          AppClass =
            Object.values(module).find(
              (exp) => typeof exp === "function" && exp.config,
            ) || module.default;
        }

        if (!AppClass) {
          throw new Error(`Application class not found for app ID: ${appId}`);
        }

        // Instantiate
        const appInstance = new AppClass({ ...appConfig, id: appId });

        // Determine instance key
        const instanceKey = this._generateInstanceKey(appInstance, data);
        appInstance.instanceKey = instanceKey;

        // Handle existing instance
        if (this.runningApps[instanceKey]) {
          const existing = this.runningApps[instanceKey];
          if (typeof existing.onRelaunch === "function") {
            await existing.onRelaunch(data);
          } else if (typeof existing.launch === "function") {
            await existing.launch(data);
          }
          return existing;
        }

        // Register
        this.runningApps[instanceKey] = appInstance;
        openApps.set(instanceKey, appInstance); // Legacy compatibility

        // Launch
        await appInstance.launch(data);

        document.dispatchEvent(
          new CustomEvent("app-launched", { detail: { appId } }),
        );
        return appInstance;
      } else if (appConfig.action?.type === "function") {
        appConfig.action.handler(data);
      } else {
        console.error(
          `No application class or legacy action found for ID: ${appId}`,
        );
      }
    } catch (error) {
      console.error(`Failed to launch app: ${appId}`, error);
      alert(`Could not launch ${appId}. See console for details.`);
    } finally {
      releaseWaitState(launchId);
    }
  }

  _generateInstanceKey(appInstance, data) {
    if (appInstance.isSingleton) {
      return appInstance.id;
    }

    // For non-singletons, we usually want a unique ID per file or just a timestamp
    if (typeof appInstance._getWindowId === "function") {
        let filePath = data;
        if (data && typeof data === "object") {
            filePath = data.file || data.filePath || data.path;
        }
        return appInstance._getWindowId(filePath);
    }

    return `${appInstance.id}-${Date.now()}`;
  }
}

const appManager = new AppManager();
export const launchApp = (appId, data) => appManager.launchApp(appId, data);

export function handleAppAction(app) {
    launchApp(app.id, app.filePath);
}

// Export the manager for use in other modules
export { appManager };
