import { networkNeighborhood } from '../../../config/network-neighborhood.js';
import { VirtualStats } from './shell-manager.js';
import { ICONS } from '../../../config/icons.js';
import { getPathName } from '../navigation/path-utils.js';

/**
 * NetworkNeighborhoodExtension - Shell extension for Network Neighborhood
 */
export class NetworkNeighborhoodExtension {
  constructor() {
    this.path = "/Network Neighborhood";
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
   * Read directory contents
   * @param {string} path
   * @returns {Promise<string[]|null>}
   */
  async readdir(path) {
    if (path !== this.path) return null;
    return networkNeighborhood.map((item) => item.title);
  }

  /**
   * Get virtual stats for a path
   * @param {string} path
   * @returns {Promise<VirtualStats>}
   */
  async stat(path) {
    if (path === this.path) {
      return new VirtualStats({
        isDirectory: true,
        isVirtual: true,
      });
    }

    const name = getPathName(path);
    const item = networkNeighborhood.find((i) => i.title === name);
    if (item) {
      return new VirtualStats({
        isDirectory: false,
        isVirtual: true,
        url: item.url,
      });
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
      // Return null to allow FileIconRenderer's themed icon logic to take over
      return null;
    }

    const name = getPathName(path);
    const item = networkNeighborhood.find((i) => i.title === name);
    if (item) {
      return ICONS.networkComputer;
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
      app.navigateTo(path);
      return true;
    }

    const name = getPathName(path);
    const item = networkNeighborhood.find((i) => i.title === name);
    if (item && item.url) {
      window.open(item.url, "_blank", "width=800,height=600");
      return true;
    }

    return false;
  }
}
