import { fs } from "@zenfs/core";
import { getParentPath } from "./PathUtils.js";

/**
 * VirtualStats - Mock fs.Stats for shell extensions
 */
export class VirtualStats {
  constructor(options = {}) {
    this._isDirectory = !!options.isDirectory;
    this.size = options.size || 0;
    this.atime = options.atime || new Date();
    this.mtime = options.mtime || new Date();
    this.ctime = options.ctime || new Date();
    this.birthtime = options.birthtime || new Date();
  }

  isDirectory() {
    return this._isDirectory;
  }

  isFile() {
    return !this._isDirectory;
  }

  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }
}

/**
 * ZenShellManager - Orchestrates virtual shell extensions in ZenExplorer
 */
export class ZenShellManager {
  static extensions = [];

  /**
   * Register a shell extension
   * @param {Object} extension
   */
  static registerExtension(extension) {
    if (!this.extensions.includes(extension)) {
      this.extensions.push(extension);
    }
  }

  /**
   * Get extension that handles a specific path
   * @param {string} path
   * @returns {Object|null}
   */
  static getExtensionForPath(path) {
    if (!path) return null;
    return this.extensions.find((ext) => ext.handlesPath(path));
  }

  /**
   * Get stats for a path, checking extensions first
   * @param {string} path
   * @returns {Promise<Object>}
   */
  static async stat(path) {
    const ext = this.getExtensionForPath(path);
    if (ext) {
      return ext.stat(path);
    }
    return fs.promises.stat(path);
  }

  /**
   * Read directory contents, merging filesystem and virtual items
   * @param {string} path
   * @returns {Promise<string[]>}
   */
  static async readdir(path) {
    let files = [];
    try {
      files = await fs.promises.readdir(path);
    } catch (e) {
      // Path might be virtual only
    }

    for (const ext of this.extensions) {
      const virtualItems = await ext.readdir(path);
      if (virtualItems) {
        // Use Set to avoid duplicates if a virtual item matches a real file
        files = [...new Set([...files, ...virtualItems])];
      }
    }

    return files;
  }

  /**
   * Get custom icon object for a path if provided by an extension
   * @param {string} path
   * @returns {Object|null}
   */
  static getIconObj(path) {
    const ext = this.getExtensionForPath(path);
    if (ext && ext.getIconObj) {
      return ext.getIconObj(path);
    }
    // Fallback for extensions that only implement getIcon
    if (ext && ext.getIcon) {
      return {
        16: ext.getIcon(path, 16),
        32: ext.getIcon(path, 32),
      };
    }
    return null;
  }

  /**
   * Get custom icon for a path if provided by an extension
   * @param {string} path
   * @param {number} size
   * @returns {string|null}
   */
  static getIcon(path, size = 32) {
    const ext = this.getExtensionForPath(path);
    if (ext && ext.getIcon) {
      return ext.getIcon(path, size);
    }
    const iconObj = this.getIconObj(path);
    return iconObj ? iconObj[size] : null;
  }

  /**
   * Handle opening a path via shell extension
   * @param {string} path
   * @param {Object} app - ZenExplorerApp instance
   * @returns {Promise<boolean>} - True if handled by extension
   */
  static async onOpen(path, app) {
    const ext = this.getExtensionForPath(path);
    if (ext && ext.onOpen) {
      return ext.onOpen(path, app);
    }
    return false;
  }

  /**
   * Get columns to display for a specific directory path
   * @param {string} path
   * @returns {Object[]} Column definitions
   */
  static getColumns(path) {
    if (path === "/") {
      return [
        { label: "Name", key: "name" },
        { label: "Type", key: "type" },
      ];
    }

    const ext = this.getExtensionForPath(path);
    if (ext && ext.getColumns) {
      return ext.getColumns(path);
    }

    return [
      { label: "Name", key: "name" },
      { label: "Size", key: "size" },
      { label: "Type", key: "type" },
      { label: "Modified", key: "modified" },
    ];
  }

  /**
   * Get the value for a specific column and path
   * @param {string} fullPath
   * @param {string} columnKey
   * @param {Object} stats
   * @returns {Promise<string|null>}
   */
  static async getColumnValue(fullPath, columnKey, stats) {
    const ext = this.getExtensionForPath(fullPath);

    // Give extension first priority for its handled paths
    if (ext && ext.getColumnValue) {
      const val = await ext.getColumnValue(fullPath, columnKey, stats);
      if (val !== undefined && val !== null) return val;
    }

    // Default handling for root items
    if (getParentPath(fullPath) === "/") {
      if (columnKey === "type") {
        if (fullPath.match(/^\/[A-Z]:$/i)) {
          return "Disk";
        }
        if (ext) {
          return "System Folder";
        }
      }
    }

    return null;
  }
}
