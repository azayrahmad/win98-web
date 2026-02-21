import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { createTaskbarButton, createTrayIcon } from '../shell/taskbar/taskbar.js';
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
    if (data) {
      filePath = typeof data === "string" ? data : (data.file || data.filePath || data);
    }

    this.win = await this._createWindow(filePath);

    if (this.win) {
      this._setupWindow(this.instanceKey);
      openWindows.set(this.instanceKey, this.win);
    }

    if (this.hasTray) {
      createTrayIcon(this);
    }

    await this._onLaunch(filePath);
  }

  /**
   * Handle relaunch of an existing instance (e.g. focusing window or loading new file)
   */
  async onRelaunch(data) {
    if (this.win) {
      const $win = $(this.win.element);
      if ($win.is(":visible")) {
        this.win.focus();
      } else {
        this.win.restore();
        setTimeout(() => this.win.focus(), 0);
      }
    }

    let filePath = null;
    if (data) {
      filePath = typeof data === "string" ? data : (data.file || data.filePath || data);
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

  _setupWindow(instanceKey) {
    this.win.element.id = instanceKey;
    this.win.element.dataset.appId = this.id;

    this.win.onClosed(() => {
      if (typeof this._onClose === "function") {
        this._onClose();
      }
      if (this.hasTaskbarButton) {
        const taskbarButton = document.querySelector(
          `.taskbar-button[for="${instanceKey}"]`,
        );
        if (taskbarButton) {
          taskbarButton.remove();
        }
      }
      openWindows.delete(instanceKey);
      this.exit();
    });

    if (this.hasTaskbarButton) {
      const taskbarButton = createTaskbarButton(
        instanceKey,
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
