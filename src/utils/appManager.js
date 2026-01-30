import {
  requestWaitState,
  releaseWaitState,
} from "./busyStateManager.js";
import { openApps } from '../apps/registries.js';
import { playSound } from "./soundManager.js";

let cachedApps = null;
async function getApps() {
    if (!cachedApps) {
        const module = await import("../config/apps.js");
        cachedApps = module.apps;
    }
    return cachedApps;
}

const appManager = {
    runningApps: {},

    getRunningApps() {
        return this.runningApps;
    },

    async getAppConfig(appId) {
        const apps = await getApps();
        return apps.find((a) => a.id === appId);
    },

    closeApp(appId) {
        const appInstance = this.runningApps[appId];
        if (appInstance) {
            playSound("Close");
            // Remove the app from the registries first to prevent re-entry.
            delete this.runningApps[appId];
            openApps.delete(appId);
            document.dispatchEvent(new CustomEvent('app-closed', { detail: { appId } }));

            // Now, perform the app-specific cleanup.
            if (appInstance.win) {
                appInstance.win.close(true); // Force close without firing onClosed.
            } else if (typeof appInstance._cleanup === 'function') {
                appInstance._cleanup(); // For non-windowed apps.
            }
        }
    }
};

export async function launchApp(appId, data = null) {
  const launchId = `launch-${appId}-${Date.now()}`;
  requestWaitState(launchId);

  const appConfig = await appManager.getAppConfig(appId);
  playSound("Open");
  if (!appConfig) {
    console.error(`No application config found for ID: ${appId}`);
    releaseWaitState(launchId);
    return;
  }

  // Handle singleton apps that are already running
  const runningApp = appManager.runningApps[appId];
  if (runningApp && appConfig.isSingleton) {
    runningApp.launch(data); // This will handle focus or file loading
    releaseWaitState(launchId);
    return runningApp;
  }

    try {
        if (appConfig.appClass) {
            const appInstance = new appConfig.appClass({ ...appConfig, id: appId });
            appManager.runningApps[appId] = appInstance;
            await appInstance.launch(data);
            document.dispatchEvent(new CustomEvent('app-launched', { detail: { appId } }));
            return appInstance;
        } else if (appConfig.action?.type === "function") {
            appConfig.action.handler();
        } else {
            console.error(`No application class or legacy action found for ID: ${appId}`);
        }
    } catch (error) {
        console.error(`Failed to launch app: ${appId}`, error);
        alert(`Could not launch ${appId}. See console for details.`);
    } finally {
        releaseWaitState(launchId);
    }
}

export function handleAppAction(app) {
    launchApp(app.id, app.filePath);
}

// Export the manager for use in other modules
export { appManager };
