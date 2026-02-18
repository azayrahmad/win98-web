import { apps } from '../config/apps.js';
import {
  requestWaitState,
  releaseWaitState,
} from './busy-state-manager.js';
import { openApps } from '../system/application.js';
import { playSound } from './sound-manager.js';

const appManager = {
    runningApps: {},

    getRunningApps() {
        return this.runningApps;
    },

    getAppConfig(appId) {
        return apps.find((a) => a.id === appId);
    },

    closeApp(instanceKey) {
        const appInstance = this.runningApps[instanceKey];
        if (appInstance) {
            playSound("Close");
            // Remove the app from the registries first to prevent re-entry.
            delete this.runningApps[instanceKey];
            openApps.delete(instanceKey);
            document.dispatchEvent(new CustomEvent('app-closed', { detail: { appId: appInstance.id, instanceKey } }));

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

  const appConfig = appManager.getAppConfig(appId);
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

            const appInstance = new AppClass({ ...appConfig, id: appId });
            // The instance will register itself in runningApps during launch into its unique instanceKey
            await appInstance.launch(data);
            document.dispatchEvent(new CustomEvent('app-launched', { detail: { appId } }));
            return appInstance;
        } else if (appConfig.action?.type === "function") {
            appConfig.action.handler(data);
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
