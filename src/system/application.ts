import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { createTaskbarButton, createTrayIcon } from '../shell/taskbar/taskbar.js';
import { appManager, AppConfig, AppInstance } from './app-manager.js';

const openWindows = new Map<string, OSGUI$Window>();
export const openApps = new Map<string, Application>();

export abstract class Application implements AppInstance {
  public config: AppConfig;
  public id: string;
  public title: string;
  public icon: any;
  public isSingleton: boolean;
  public hasTaskbarButton: boolean;
  public hasTray: boolean;
  public tray: any;
  public win: OSGUI$Window | null = null;
  public instanceKey: string = '';

  public width?: number;
  public height?: number;
  public resizable?: boolean;
  public minimizeButton?: boolean;
  public maximizeButton?: boolean;

  constructor(config: AppConfig) {
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
    this.hasTaskbarButton = (config as any).hasTaskbarButton !== false;
    this.hasTray = config.hasTray === true;
    this.tray = config.tray;

    // Store window properties
    this.width = config.width;
    this.height = config.height;
    this.resizable = config.resizable;
    this.minimizeButton = config.minimizeButton;
    this.maximizeButton = config.maximizeButton;
  }

  async launch(data: any = null): Promise<void> {
    let filePath: any = null;
    let windowIdOverride: string | null = null;

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

    if (openApps.has(instanceKey)) {
      const existingApp = openApps.get(instanceKey)!;
      if (existingApp.win) {
        const $win = $(existingApp.win.element);
        if ($win.is(":visible")) {
          existingApp.win.focus();
        } else {
          existingApp.win.restore();
          setTimeout(() => existingApp.win!.focus(), 0);
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
      createTrayIcon(this as any);
    }

    await this._onLaunch(filePath);
    openApps.set(instanceKey, this);
    appManager.runningApps[instanceKey] = this;
  }

  _getWindowId(filePath: any): string {
    const fileName = filePath?.name || filePath?.filename;
    if (filePath && typeof filePath === "object" && fileName) {
      return `${this.id}-${fileName}`;
    }
    return filePath && typeof filePath === "string"
      ? `${this.id}-${filePath}`
      : this.id;
  }

  abstract _createWindow(filePath: any): Promise<OSGUI$Window | null>;

  async _onLaunch(_filePath: any): Promise<void> {
    // Optional hook for subclasses to implement for post-launch logic
  }

  _setupWindow(windowId: string, instanceKey: string): void {
    if (!this.win) return;
    this.win.element.id = windowId;
    this.win.element.dataset.appId = this.id;

    this.win.onClosed(() => {
      if (typeof (this as any)._onClose === "function") {
        (this as any)._onClose();
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
      if (taskbarButton) {
        this.win.element.classList.add("app-window");
        this.win.setMinimizeTarget(taskbarButton as HTMLElement);
      }
    }

    this.win.center();
    this.win.focus();
  }

  showProperties(): void {
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
      buttons: [{ label: "OK", action: () => {}, isDefault: true }],
    });
  }

  _cleanup?(): void;
}
