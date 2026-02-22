import { iconSchemes } from '../../config/icon-schemes.js';
import { ICONS } from '../../config/icons.js';
import { kernel } from '../../system/kernel.js';

/**
 * Retrieves the icon for a given identifier, considering the current icon scheme.
 * Falls back to the default scheme's icon if the current scheme has no specific icon.
 *
 * @param {string} iconIdentifier - The identifier for the icon (e.g., "myComputer").
 * @returns {object} The icon object with 16 and 32 pixel versions, or null if not found.
 */
export function getIcon(iconIdentifier) {
  const iconSchemeName = kernel.use('theme').getIconSchemeName() || "default";
  const scheme = iconSchemes[iconSchemeName] || iconSchemes["default"];

  return (
    scheme.getIconObj(iconIdentifier) || ICONS[iconIdentifier] || ICONS.file
  );
}
