import { ICONS } from "../../../config/icons.js";
import { apps } from "../../../config/apps.js";
import { launchApp } from "../../../utils/appManager.js";
import { VirtualStats } from "../utils/ZenShellManager.js";
import { getPathName } from "../utils/PathUtils.js";

/**
 * ControlPanelExtension - Shell extension for the virtual Control Panel folder
 */
export class ControlPanelExtension {
  constructor() {
    this.path = "/Control Panel";
    this.items = [
      { id: "display", name: "Display", appId: "displayproperties" },
      { id: "themes", name: "Desktop Themes", appId: "desktopthemes" },
      { id: "sounds", name: "Sound", appId: "soundschemeexplorer" },
      { id: "themetocss", name: "Theme to CSS", appId: "themetocss" },
      { id: "mouse", name: "Mouse", appId: "cursorexplorer" },
    ];
  }

  /**
   * Check if this extension handles the given path
   * @param {string} path
   * @returns {boolean}
   */
  handlesPath(path) {
    return path === this.path || path.startsWith(this.path + "/");
  }

  /**
   * Get virtual stats for a path
   * @param {string} path
   * @returns {Promise<VirtualStats>}
   */
  async stat(path) {
    if (path === this.path) {
      return new VirtualStats({ isDirectory: true });
    }

    const name = getPathName(path);
    const item = this.items.find((i) => i.name === name);
    if (item) {
      return new VirtualStats({ isDirectory: false });
    }

    throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
  }

  /**
   * Read virtual directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    if (path === "/") {
      return ["Control Panel"];
    }
    if (path === this.path) {
      return this.items.map((i) => i.name);
    }
    return null;
  }

  /**
   * Get custom icon object for a path
   * @param {string} path
   * @returns {Object|null}
   */
  getIconObj(path) {
    if (path === this.path) {
      return ICONS.controlPanel;
    }

    const name = getPathName(path);
    const item = this.items.find((i) => i.name === name);
    if (item) {
      const app = apps.find((a) => a.id === item.appId);
      return app ? app.icon : ICONS.file;
    }

    return null;
  }

  /**
   * Get custom icon for a path
   * @param {string} path
   * @param {number} size
   * @returns {string|null}
   */
  getIcon(path, size = 32) {
    const iconObj = this.getIconObj(path);
    return iconObj ? iconObj[size] : null;
  }

  /**
   * Handle opening a path
   * @param {string} path
   * @param {Object} app - ZenExplorerApp instance
   * @returns {Promise<boolean>}
   */
  async onOpen(path, app) {
    if (path === this.path) {
      app.navigateTo(this.path);
      return true;
    }

    const name = getPathName(path);
    const item = this.items.find((i) => i.name === name);
    if (item) {
      launchApp(item.appId);
      return true;
    }

    return false;
  }
}
