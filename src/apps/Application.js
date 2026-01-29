import { ShowDialogWindow } from "../components/DialogWindow.js";
import { createTaskbarButton, createTrayIcon } from "../components/taskbar.js";
import { appManager } from "../utils/appManager.js";

const openWindows = new Map();
export const openApps = new Map();

export class Application {
  constructor(config) {
    if (this.constructor === Application) {
      throw new TypeError(
        'Abstract class "Application" cannot be instantiated directly.',
      );
    }

    this.config = config; // Store the entire config object
    this.id = config.id;
    this.title = config.title;
    this.icon = config.icon;
    this.isSingleton = config.isSingleton !== false;
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

    if (openApps.has(instanceKey)) {
      const existingApp = openApps.get(instanceKey);
      if (existingApp.win) {
        const $win = $(existingApp.win.element);
        if ($win.is(":visible")) {
          existingApp.win.focus();
        } else {
          existingApp.win.restore();
          setTimeout(() => existingApp.win.focus(), 0);
        }
      } else if (!existingApp.win && existingApp.isSingleton) {
        // It's a non-windowed singleton app, delegate to its own launch logic
        existingApp._onLaunch(filePath);
      }
      return;
    }

    this.win = await this._createWindow(filePath);

    if (this.win) {
      this._setupWindow(windowId, instanceKey);
      openWindows.set(windowId, this.win);
    }

    if (this.hasTray) {
      createTrayIcon(this);
    }

    await this._onLaunch(filePath);
    openApps.set(instanceKey, this);
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
      openApps.delete(instanceKey);

      // Check if this was the last instance of this application type
      let isLastInstance = true;
      if (!this.isSingleton) {
        // For non-singletons, check if any other instances are still in openApps
        for (const key of openApps.keys()) {
          if (key.startsWith(this.id)) {
            isLastInstance = false;
            break;
          }
        }
      }
      // For singletons, isLastInstance remains true, as the only instance was just removed.
      //
      appManager.closeApp(this.id);
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
