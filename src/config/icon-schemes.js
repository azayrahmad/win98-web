import { ICONS } from './icons.js';

export class IconItem {
  constructor(paths = {}) {
    this["16"] = paths["16"] || "";
    this["32"] = paths["32"] || "";
  }
}

export class IconScheme {
  static ALL_ICONS = [
    "myComputer",
    "myDocuments",
    "networkNeighborhood",
    "recycleBinEmpty",
    "recycleBinFull",
  ];

  constructor(id, icons = {}) {
    this.id = id;
    this.icons = {};

    for (const iconKey of IconScheme.ALL_ICONS) {
      this.icons[iconKey] = new IconItem(icons[iconKey] || {});
    }
  }

  /**
   * Gets the icon URL for a given name and size, falling back to the default scheme if not found.
   * @param {string} iconName
   * @param {number|string} size - 16 or 32
   * @returns {string|null}
   */
  getIcon(iconName, size = 32) {
    const icon = this.getIconObj(iconName);
    if (icon && icon[size]) {
      return icon[size];
    }
    return null;
  }

  /**
   * Gets the icon object containing 16 and 32 sizes, falling back to default.
   * @param {string} iconName
   * @returns {Object|null}
   */
  getIconObj(iconName) {
    const icon = this.icons[iconName];
    if (icon && (icon["16"] || icon["32"])) return icon;

    if (this.id !== "default") {
      return iconSchemes.default?.getIconObj(iconName);
    }

    return null;
  }
}

export const iconSchemes = {
  default: new IconScheme("default", {
    myComputer: ICONS.computer,
    recycleBinFull: ICONS.recycleBinFull,
    recycleBinEmpty: ICONS.recycleBinEmpty,
    networkNeighborhood: ICONS.networkNeighborhood,
    myDocuments: ICONS.folder,
  }),
};
