import { fs } from "@zenfs/core";
import { ICONS } from '../../../config/icons.js';
import { VirtualStats } from './shell-manager.js';
import { getPathName, joinPath } from '../navigation/path-utils.js';

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
        isDirectory: true,
      },
      {
        name: "My Documents",
        icon: ICONS.documents,
        target: "/C:/My Documents",
        isDirectory: true,
      },
      {
        name: "Internet Explorer",
        icon: ICONS["internet-explorer"],
        target: "launch:internet-explorer",
      },
      {
        name: "Network Neighborhood",
        icon: ICONS.networkNeighborhood,
        target: "/Network Neighborhood",
        isDirectory: true,
      },
      {
        name: "Recycle Bin",
        icon: ICONS.recycleBinEmpty,
        target: "/Recycle Bin",
        isDirectory: true,
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
      const parts = path.split("/").filter((p) => p);
      if (parts.length === 2) {
        const name = parts[1];
        const item = this.virtualItems.find((i) => i.name === name);
        if (item) {
          return new VirtualStats({
            isDirectory: item.isDirectory || false,
            isVirtual: true,
          });
        }
      }

      // Fallback to real filesystem for other items in virtual folder
      return fs.promises.stat(this.getRealPath(path));
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
      return fs.promises.readdir(this.getRealPath(path));
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
      // Return null for themed items to allow FileIconRenderer's dynamic icon logic to take over
      if (["Recycle Bin", "My Computer", "Network Neighborhood"].includes(name)) return null;
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
      const parts = path.split("/").filter((p) => p);
      // parts = ["Desktop", "Item Name", ...]
      if (parts.length >= 2) {
        const itemName = parts[1];
        const item = this.virtualItems.find((i) => i.name === itemName);
        if (item && item.target && !item.target.startsWith("launch:")) {
          const subPath = parts.slice(2).join("/");
          return subPath ? joinPath(item.target, subPath) : item.target;
        }
      }
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
      if (item.target.startsWith("launch:")) {
        const appId = item.target.split(":")[1];
        const { launchApp } = await import('../../../system/app-manager.js');
        launchApp(appId);
        return true;
      }
      app.navigateTo(item.target);
      return true;
    }

    // For real files opened from the virtual path, use the real path for the app
    if (path.startsWith(this.virtualPath + "/")) {
      const relativePath = path.substring(this.virtualPath.length);
      const realFullPath = joinPath(this.realPath, relativePath);

      const stats = await fs.promises.stat(realFullPath);
      if (!stats.isDirectory()) {
        if (name.endsWith(".lnk.json") || name.endsWith(".lnk")) return false; // Let the app handle shortcuts

        const { getAssociation } = await import('../../../system/directory.js');
        const { launchApp } = await import('../../../system/app-manager.js');
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
