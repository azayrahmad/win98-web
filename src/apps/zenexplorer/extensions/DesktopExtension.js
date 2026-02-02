import { fs } from "@zenfs/core";
import { ICONS } from "../../../config/icons.js";
import { VirtualStats } from "./VirtualStats.js";
import { getPathName, joinPath } from "../navigation/PathUtils.js";

/**
 * DesktopExtension - Shell extension for the Desktop folder
 */
export class DesktopExtension {
  constructor() {
    this.virtualPath = "/Desktop";
    this.realPath = "/C:/WINDOWS/Desktop";
    this.virtualItems = [
      {
        name: "My Computer",
        icon: ICONS.computer,
        target: "/",
      },
      {
        name: "My Documents",
        icon: ICONS.documents,
        target: "/C:/My Documents",
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
    return path === this.virtualPath || path.startsWith(this.virtualPath + "/") ||
           path === this.realPath || path.startsWith(this.realPath + "/");
  }

  /**
   * Get virtual stats for a path
   * @param {string} path
   * @returns {Promise<VirtualStats>}
   */
  async stat(path) {
    if (path === this.virtualPath || path === this.realPath) {
      return new VirtualStats({ isDirectory: true });
    }

    // Handle virtual path children
    if (path.startsWith(this.virtualPath + "/")) {
      const name = getPathName(path);
      const item = this.virtualItems.find((i) => i.name === name);
      if (item) {
        return new VirtualStats({ isDirectory: false, isVirtual: true });
      }

      // Fallback to real filesystem for other items in virtual folder
      const relativePath = path.substring(this.virtualPath.length);
      return fs.promises.stat(joinPath(this.realPath, relativePath));
    }

    // Fallback to real filesystem for real path items (ensures no virtual items)
    return fs.promises.stat(path);
  }

  /**
   * Read virtual directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    // Virtual Desktop path merges virtual items and real files
    if (path === this.virtualPath) {
      const virtualNames = this.virtualItems.map((i) => i.name);
      try {
        const realNames = await fs.promises.readdir(this.realPath);
        // Use Set to avoid duplicates if a virtual item matches a real file
        return [...new Set([...virtualNames, ...realNames])];
      } catch (e) {
        return virtualNames;
      }
    }

    // Subfolders of the virtual desktop stay virtual
    if (path.startsWith(this.virtualPath + "/")) {
      const relativePath = path.substring(this.virtualPath.length);
      const realFullPath = joinPath(this.realPath, relativePath);
      return fs.promises.readdir(realFullPath);
    }

    // Returning null for the real path ensures virtual items are NOT shown there
    return null;
  }

  /**
   * Get custom icon object for a path
   * @param {string} path
   * @returns {Object|null}
   */
  getIconObj(path) {
    if (path === this.virtualPath || path === this.realPath) {
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
   * Get the real filesystem path for a virtual desktop path
   * @param {string} path
   * @returns {string}
   */
  getRealPath(path) {
    if (path === this.virtualPath) {
      return this.realPath;
    }
    if (path.startsWith(this.virtualPath + "/")) {
      const relativePath = path.substring(this.virtualPath.length);
      return joinPath(this.realPath, relativePath);
    }
    return path;
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
    if (path === this.virtualPath) {
      app.navigateTo(this.virtualPath);
      return true;
    }

    const name = getPathName(path);
    const item = this.virtualItems.find((i) => i.name === name);
    if (item) {
      app.navigateTo(item.target);
      return true;
    }

    // For real files opened from the virtual path, use the real path for the app
    if (path.startsWith(this.virtualPath + "/")) {
      const relativePath = path.substring(this.virtualPath.length);
      const realFullPath = joinPath(this.realPath, relativePath);

      const stats = await fs.promises.stat(realFullPath);
      if (!stats.isDirectory()) {
        const { getAssociation } = await import("../../../utils/directory.js");
        const { launchApp } = await import("../../../utils/appManager.js");
        const association = getAssociation(name);
        if (association.appId) {
          launchApp(association.appId, realFullPath);
          return true;
        }
      }
    }

    return false;
  }
}
