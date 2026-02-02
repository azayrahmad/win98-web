import { fs } from "@zenfs/core";
import { ICONS } from "../../../config/icons.js";
import { VirtualStats } from "./ShellManager.js";
import { getPathName } from "../navigation/PathUtils.js";

/**
 * DesktopExtension - Shell extension for the Desktop folder
 */
export class DesktopExtension {
  constructor() {
    this.path = "/C:/WINDOWS/Desktop";
    this.virtualItems = [
      {
        name: "My Computer",
        icon: ICONS.computer,
        target: "/",
      },
      {
        name: "Recycle Bin",
        icon: ICONS.recycleBinEmpty,
        target: "/Recycle Bin",
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
    const item = this.virtualItems.find((i) => i.name === name);
    if (item) {
      return new VirtualStats({ isDirectory: false, isVirtual: true });
    }

    // Fallback to real filesystem for other items in this folder
    return fs.promises.stat(path);
  }

  /**
   * Read virtual directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    // If we are in the parent directory, ensure Desktop shows up
    if (path === "/C:/WINDOWS") {
      return ["Desktop"];
    }
    // If we are in the Desktop directory, show virtual items
    if (path === this.path) {
      return this.virtualItems.map((i) => i.name);
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
      return ICONS.desktop_old;
    }

    const name = getPathName(path);
    const item = this.virtualItems.find((i) => i.name === name);
    if (item) {
      return item.icon;
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
    const name = getPathName(path);
    const item = this.virtualItems.find((i) => i.name === name);
    if (item) {
      app.navigateTo(item.target);
      return true;
    }

    return false;
  }
}
