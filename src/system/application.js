import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { createTaskbarButton, createTrayIcon } from '../shell/taskbar/taskbar.js';
import { appManager } from './app-manager.js';
import { BaseProcess } from './base-process.js';

const openWindows = new Map();
export const openApps = new Map();

/**
 * WindowedApplication extends BaseProcess with windowing and shell integration.
 */
export class WindowedApplication extends BaseProcess {
  constructor(config) {
    super(config);
    if (this.constructor === WindowedApplication) {
      throw new TypeError(
        'Abstract class "WindowedApplication" cannot be instantiated directly.',
      );
    }

    this.icon = config.icon;
    this.hasTaskbarButton = config.hasTaskbarButton !== false;
    this.hasTray = config.hasTray === true;
    this.tray = config.tray;
    this.win = null;

    // Store window properties
    this.width = config.width;
    this.height = config.height;
    this.resizable = config.resizable;
    this.minimizeButton = config.minimizeButton;
    this.maximizeButton = config.maximizeButton;
  }

  async launch(data = null) {
    let filePath = null;
    let windowIdOverride = null;

    if (data) {
      if (typeof data === "string") {
        filePath = data;
      } else {
        // Handle both file objects and file path strings
        filePath = data.file || data.filePath || data;
        windowIdOverride = data.windowId;
      }
    }

    const windowId = windowIdOverride || this._getWindowId(filePath);
    const instanceKey = this.isSingleton ? this.id : windowId;
    this.instanceKey = instanceKey;

    const appManager = this.kernel.use('appManager');

    if (appManager.runningApps[instanceKey]) {
      const existingApp = appManager.runningApps[instanceKey];
      if (existingApp.win) {
        const $win = $(existingApp.win.element);
        if ($win.is(":visible")) {
          existingApp.win.focus();
        } else {
          existingApp.win.restore();
          setTimeout(() => existingApp.win.focus(), 0);
        }
      } else {
        // Delegate to its own launch logic (e.g. for singletons or background relaunch)
        existingApp._onLaunch(filePath);
      }
      return;
    }

    // Register
    appManager.runningApps[instanceKey] = this;
    openApps.set(instanceKey, this); // Legacy support

    this.win = await this._createWindow(filePath);

    if (this.win) {
      this._setupWindow(windowId, instanceKey);
      openWindows.set(windowId, this.win);
    }

    if (this.hasTray) {
      createTrayIcon(this);
    }

    await this._onLaunch(filePath);
  }

  _getWindowId(filePath) {
    const fileName = filePath?.name || filePath?.filename;
    if (filePath && typeof filePath === "object" && fileName) {
      return `${this.id}-${fileName}`;
    }
    return filePath && typeof filePath === "string"
      ? `${this.id}-${filePath}`
      : this.id;
  }

  _createWindow(filePath) {
    throw new Error("Application must implement the _createWindow() method.");
  }

  async _onLaunch(filePath) {
    // Optional hook for subclasses to implement for post-launch logic
  }

  _setupWindow(windowId, instanceKey) {
    this.win.element.id = windowId;
    this.win.element.dataset.appId = this.id;

    this.win.onClosed(() => {
      if (typeof this._onClose === "function") {
        this._onClose();
      }
      if (this.hasTaskbarButton) {
        const taskbarButton = document.querySelector(
          `.taskbar-button[for="${windowId}"]`,
        );
        if (taskbarButton) {
          taskbarButton.remove();
        }
      }
      openWindows.delete(windowId);
      appManager.closeApp(instanceKey);
    });

    if (this.hasTaskbarButton) {
      const taskbarButton = createTaskbarButton(
        windowId,
        this.icon,
        this.title,
      );
      this.win.element.classList.add("app-window");
      this.win.setMinimizeTarget(taskbarButton);
    }

    this.win.center();
    this.win.focus();
  }

  showProperties() {
    let text = `<b>${this.config.title}</b>`;
    if (this.config.description) {
      text += `<br><br>${this.config.description}`;
    }
    if (this.config.summary) {
      text += `<br><br>${this.config.summary}`;
    }

    ShowDialogWindow({
      title: `${this.config.title} Properties`,
      contentIconUrl: this.config.icon[32],
      text: text,
      buttons: [{ label: "OK", isDefault: true }],
    });
  }
}

/**
 * Legacy alias for WindowedApplication
 * @deprecated Use WindowedApplication instead
 */
export const Application = WindowedApplication;
