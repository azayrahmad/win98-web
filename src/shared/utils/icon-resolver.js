import { getIconSchemeName } from '../../system/theme-manager.js';
import { iconSchemes } from '../../config/icon-schemes.js';
import { ICONS } from '../../config/icons.js';

/**
 * Retrieves the icon for a given identifier, considering the current icon scheme.
 * Falls back to the default scheme's icon if the current scheme has no specific icon.
 *
 * @param {string} iconIdentifier - The identifier for the icon (e.g., "myComputer").
 * @returns {object} The icon object with 16 and 32 pixel versions, or null if not found.
 */
export function getIcon(iconIdentifier) {
  const iconSchemeName = getIconSchemeName() || "default";
  const scheme = iconSchemes[iconSchemeName] || iconSchemes["default"];

  return scheme[iconIdentifier] || ICONS[iconIdentifier] || ICONS.file;
}
