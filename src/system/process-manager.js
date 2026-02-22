import { apps } from '../config/apps.js';
import { requestWaitState, releaseWaitState } from './busy-state-manager.js';
import { playSound } from './sound-manager.js';
import { kernel } from './kernel.js';

/**
 * ProcessManager handles the lifecycle of all system processes.
 * It modernizes the legacy AppManager with better event handling and SRP.
 */
export class ProcessManager {
  constructor(eventBus) {
    this.eventBus = eventBus || kernel.use('events');
    this.runningProcesses = new Map();
  }

  /**
   * Returns a list of all currently running processes.
   */
  getRunningProcesses() {
    return Array.from(this.runningProcesses.values());
  }

  /**
   * Legacy alias for getRunningProcesses.
   * @deprecated Use getRunningProcesses instead.
   */
  getRunningApps() {
    // Return a Map-like object for compatibility if needed,
    // or just the array if that's what was expected.
    // TaskManagerApp expects an object where keys are instanceKeys.
    const apps = {};
    this.runningProcesses.forEach((p, key) => {
      apps[key] = p;
    });
    return apps;
  }

  /**
   * Checks if a specific application is currently running.
   * @param {string} appId
   */
  isProcessRunning(appId) {
    return Array.from(this.runningProcesses.values()).some(p => p.id === appId);
  }

  /**
   * Retrieves the configuration for an application.
   * @param {string} appId
   */
  getAppConfig(appId) {
    return apps.find((a) => a.id === appId);
  }

  /**
   * Launches an application.
   * @param {string} appId
   * @param {any} data
   */
  async launch(appId, data = null) {
    const launchId = `launch-${appId}-${Date.now()}`;
    requestWaitState(launchId);

    const appConfig = this.getAppConfig(appId);
    if (!appConfig) {
      console.error(`No application config found for ID: ${appId}`);
      releaseWaitState(launchId);
      return;
    }

    playSound("Open");

    try {
      if (appConfig.action?.type === "function") {
        return appConfig.action.handler(data);
      }

      let AppClass = appConfig.appClass;

      // Handle lazy loading
      if (typeof AppClass === "function" && !AppClass.prototype) {
        const module = await AppClass();
        AppClass = Object.values(module).find(
          (exp) => typeof exp === "function" && exp.config
        ) || module.default;
      }

      if (!AppClass) {
        throw new Error(`Application class not found for app ID: ${appId}`);
      }

      // Collect services to inject
      const services = {
        kernel: kernel,
        events: this.eventBus,
        processManager: this,
        ui: kernel.use('ui'),
        settings: kernel.use('settings'),
      };

      // Instantiate the application with DI
      const process = new AppClass({ ...appConfig, id: appId }, services);

      // Determine unique instance key
      const instanceKey = this._generateInstanceKey(process, data);
      process.instanceKey = instanceKey;

      // Check if instance is already running
      if (this.runningProcesses.has(instanceKey)) {
        const existing = this.runningProcesses.get(instanceKey);
        if (typeof existing.onRelaunch === "function") {
          await existing.onRelaunch(data);
        } else {
          await existing.launch(data);
        }
        return existing;
      }

      // Register and launch
      this.runningProcesses.set(instanceKey, process);
      await process.launch(data);

      this.eventBus.emit('process:launched', { appId, instanceKey, process });

      // Legacy event for backward compatibility
      document.dispatchEvent(new CustomEvent("app-launched", { detail: { appId } }));

      return process;
    } catch (error) {
      console.error(`Failed to launch process: ${appId}`, error);
      kernel.use('ui').showDialog({
          title: "Launch Error",
          text: `Could not launch ${appId}.`,
          buttons: [{ label: "OK", isDefault: true }]
      });
    } finally {
      releaseWaitState(launchId);
    }
  }

  /**
   * Terminates a process.
   * @param {string} instanceKey
   */
  terminate(instanceKey) {
    const process = this.runningProcesses.get(instanceKey);
    if (process) {
      // Guard against re-entry
      this.runningProcesses.delete(instanceKey);

      playSound("Close");

      this.eventBus.emit('process:terminated', { appId: process.id, instanceKey });

      if (process.win && !process.win.closed) {
        process.win.close(true);
      } else if (typeof process._cleanup === "function") {
        process._cleanup();
      }
    }
  }

  _generateInstanceKey(process, data) {
    if (process.isSingleton) {
      return process.id;
    }

    if (typeof process._getWindowId === "function") {
      let filePath = data;
      if (data && typeof data === "object") {
        filePath = data.file || data.filePath || data.path;
      }
      return process._getWindowId(filePath);
    }

    return `${process.id}-${Date.now()}`;
  }
}
