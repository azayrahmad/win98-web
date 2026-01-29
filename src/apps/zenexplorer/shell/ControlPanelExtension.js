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
      {
        id: "display",
        name: "Display",
        appId: "displayproperties",
        description: "Customize your display settings.",
      },
      {
        id: "themes",
        name: "Desktop Themes",
        appId: "desktopthemes",
        description: "Customize your desktop's appearance.",
      },
      {
        id: "sounds",
        name: "Sound",
        appId: "soundschemeexplorer",
        description: "Explore and listen to sound schemes.",
      },
      {
        id: "themetocss",
        name: "Theme to CSS",
        appId: "themetocss",
        description: "Convert a Windows theme file to CSS.",
      },
      {
        id: "mouse",
        name: "Mouse",
        appId: "cursorexplorer",
        description: "Explore and preview cursor schemes.",
      },
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
   * Get columns for the Control Panel directory
   * @returns {Object[]}
   */
  getColumns() {
    return [
      { label: "Name", key: "name" },
      { label: "Description", key: "description" },
    ];
  }

  /**
   * Get column value for Control Panel items
   * @param {string} fullPath
   * @param {string} columnKey
   * @returns {string|null}
   */
  getColumnValue(fullPath, columnKey) {
    const name = getPathName(fullPath);
    const item = this.items.find((i) => i.name === name);
    if (item && columnKey === "description") {
      return item.description;
    }
    return null;
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
