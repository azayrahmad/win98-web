import { fs } from "@zenfs/core";
import { ICONS } from "../../../config/icons.js";
import { VirtualStats } from "./ShellManager.js";
import { getPathName } from "../navigation/PathUtils.js";

/**
 * DesktopExtension - Shell extension for the Desktop folder in C:\WINDOWS
 */
export class DesktopExtension {
  constructor() {
    this.path = "/C:/WINDOWS/Desktop";
  }

  /**
   * Check if this extension handles the given path
   * @param {string} path
   * @returns {boolean}
   */
  handlesPath(path) {
    if (!path) return false;
    const p = path.replace(/\/$/, "");
    return p === this.path || p === this.path + "/My Computer";
  }

  /**
   * Get virtual stats for a path
   * @param {string} path
   * @returns {Promise<Object>}
   */
  async stat(path) {
    const p = path.replace(/\/$/, "");
    if (p === this.path) {
      return fs.promises.stat(this.path);
    }
    if (p === this.path + "/My Computer") {
      return new VirtualStats({ isDirectory: false });
    }
    return fs.promises.stat(path);
  }

  /**
   * Read virtual directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    if (path && path.replace(/\/$/, "") === this.path) {
      return ["My Computer"];
    }
    return null;
  }

  /**
   * Get custom icon object for a path
   * @param {string} path
   * @returns {Object|null}
   */
  getIconObj(path) {
    const p = path.replace(/\/$/, "");
    if (p === this.path) {
      return ICONS.desktop;
    }
    if (p === this.path + "/My Computer") {
      return ICONS.computer;
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
    const p = path.replace(/\/$/, "");
    if (p === this.path) {
      app.navigateTo(this.path);
      return true;
    }
    if (p === this.path + "/My Computer") {
      app.navigateTo("/");
      return true;
    }
    return false;
  }

  /**
   * Get column value for Desktop items
   * @param {string} fullPath
   * @param {string} columnKey
   * @returns {string|null}
   */
  getColumnValue(fullPath, columnKey) {
    const name = getPathName(fullPath);
    if (name === "My Computer" && columnKey === "type") {
      return "System Folder";
    }
    return null;
  }
}
