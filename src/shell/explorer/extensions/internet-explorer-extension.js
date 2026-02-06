import { VirtualStats } from './shell-manager.js';
import { ICONS } from '../../../config/icons.js';

/**
 * InternetExplorerExtension - Shell extension for web URLs
 */
export class InternetExplorerExtension {
  constructor() {
    this.name = "Internet Explorer";
  }

  /**
   * Check if this extension handles the given path
   * @param {string} path
   * @returns {boolean}
   */
  handlesPath(path) {
    if (!path) return false;
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.includes("azay.rahmad")
    ) {
      return true;
    }
    // Domain-like: contains a dot, doesn't start with a slash or drive letter, and no spaces
    return (
      !path.startsWith("/") &&
      !/^[A-Z]:/i.test(path) &&
      path.includes(".") &&
      !path.includes(" ")
    );
  }

  /**
   * Get virtual stats for a path
   * @param {string} path
   * @returns {Promise<VirtualStats>}
   */
  async stat(path) {
    if (this.handlesPath(path)) {
      return new VirtualStats({
        isDirectory: false,
        isVirtual: true,
        size: 0,
      });
    }
    throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
  }

  /**
   * Read virtual directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    return null;
  }

  /**
   * Get custom icon object for a path
   * @param {string} path
   * @returns {Object|null}
   */
  getIconObj(path) {
    if (this.handlesPath(path)) {
      return ICONS["internet-explorer"];
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
    if (this.handlesPath(path)) {
      app.navigateTo(path);
      return true;
    }
    return false;
  }
}
