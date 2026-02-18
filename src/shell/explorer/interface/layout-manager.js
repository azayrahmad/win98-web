import { fs } from "@zenfs/core";
import { joinPath, getPathName } from '../navigation/path-utils.js';
import { ShellManager } from '../extensions/shell-manager.js';

/**
 * LayoutManager - Manages folder layouts (icon positions and order)
 */
export const LayoutManager = {
  /**
   * Get the layout file path for a given directory path.
   * Redirects root and virtual folders to /C:/WINDOWS for persistence.
   * @private
   */
  _getLayoutPath(path) {
    if (path === "/" || ShellManager.getExtensionForPath(path)) {
      const name = getPathName(path);
      return `/C:/WINDOWS/${name}.zen_layout.json`;
    }
    return joinPath(path, ".zen_layout.json");
  },

  /**
   * Get layout for a specific path
   * @param {string} path
   * @returns {Promise<Object>}
   */
  async getLayout(path) {
    const layoutPath = this._getLayoutPath(path);
    try {
      const content = await fs.promises.readFile(layoutPath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      // Default layout
      return {
        autoArrange: true,
        sortBy: "name",
        positions: {},
        order: [],
      };
    }
  },

  /**
   * Save layout for a specific path
   * @param {string} path
   * @param {Object} layout
   * @param {string} sourceAppId - Optional ID of the app that triggered the save
   */
  async saveLayout(path, layout, sourceAppId = null) {
    const layoutPath = this._getLayoutPath(path);
    try {
      await fs.promises.writeFile(layoutPath, JSON.stringify(layout, null, 2));
      // Notify other windows
      document.dispatchEvent(
        new CustomEvent("layout-change", { detail: { path, sourceAppId } }),
      );
    } catch (e) {
      console.error("Failed to save layout:", e);
    }
  },

  /**
   * Update position for a single item
   * @param {string} path - Folder path
   * @param {string} name - Item name
   * @param {number} x
   * @param {number} y
   * @param {string} sourceAppId
   */
  async updateItemPosition(path, name, x, y, sourceAppId = null) {
    const layout = await this.getLayout(path);
    layout.positions[name] = { x, y };
    await this.saveLayout(path, layout, sourceAppId);
  },

  /**
   * Update positions for multiple items
   * @param {string} path - Folder path
   * @param {Object} positions - Map of name to {x, y}
   * @param {string} sourceAppId
   */
  async updateItemPositions(path, positions, sourceAppId = null) {
    const layout = await this.getLayout(path);
    layout.positions = { ...layout.positions, ...positions };
    await this.saveLayout(path, layout, sourceAppId);
  },
};

export default LayoutManager;
