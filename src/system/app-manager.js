import { kernel } from './kernel.js';

/**
 * Legacy wrapper for AppManager.
 * New code should use kernel.use('processManager').
 */
export const appManager = {
  getRunningApps: () => kernel.use('processManager').getRunningProcesses(),
  isProcessRunning: (appId) => kernel.use('processManager').isProcessRunning(appId),
  getAppConfig: (appId) => kernel.use('processManager').getAppConfig(appId),
  closeApp: (instanceKey) => kernel.use('processManager').terminate(instanceKey),
  launchApp: (appId, data) => kernel.use('processManager').launch(appId, data),
};

export const launchApp = (appId, data) => appManager.launchApp(appId, data);

export function handleAppAction(app) {
    launchApp(app.id, app.filePath);
}
