import { ICONS } from "../../../config/icons.js";
import { getAssociation } from "../../../utils/directory.js";
import { getDisplayName } from "../utils/PathUtils.js";
import { RecycleBinManager } from "../utils/RecycleBinManager.js";

/**
 * FileIconRenderer - Handles rendering of file/folder icons in ZenExplorer
 */

/**
 * Get appropriate icon object for a file based on name and type
 * @param {string} fileName - Name of the file
 * @param {boolean} isDir - Whether this is a directory
 * @returns {Object} Icon object with 16 and 32 sizes
 */
export function getIconObjForFile(fileName, isDir) {
  if (isDir) {
    if (fileName.match(/^A:$/i)) {
      return ICONS.disketteDrive;
    }
    if (fileName.match(/^E:$/i)) {
      return ICONS.cdDrive;
    }
    if (fileName.match(/^[A-Z]:$/i)) {
      return ICONS.drive;
    }
    return ICONS.folderClosed;
  }

  const association = getAssociation(fileName);
  return association.icon;
}

/**
 * Get appropriate icon for a file based on name and type (default 32px)
 * @param {string} fileName - Name of the file
 * @param {boolean} isDir - Whether this is a directory
 * @returns {string} Icon URL
 */
export function getIconForFile(fileName, isDir) {
  return getIconObjForFile(fileName, isDir)[32];
}

/**
 * Render a file icon element
 * @param {string} fileName - Name of the file
 * @param {string} fullPath - Full path to the file
 * @param {boolean} isDir - Whether this is a directory
 * @param {Object} [options] - Additional options (metadata, etc.)
 * @returns {Promise<HTMLElement>} Icon element
 */
export async function renderFileIcon(fileName, fullPath, isDir, options = {}) {
  const iconDiv = document.createElement("div");
  iconDiv.className = "explorer-icon";
  iconDiv.setAttribute("tabindex", "0");
  iconDiv.setAttribute("data-path", fullPath);
  iconDiv.setAttribute("data-type", isDir ? "directory" : "file");
  iconDiv.setAttribute("data-name", fileName);

  const iconInner = document.createElement("div");
  iconInner.className = "icon";

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "icon-wrapper";

  let iconObj = getIconObjForFile(fileName, isDir);
  let displayName = getDisplayName(fileName);

  // Special handling for Recycle Bin folder
  if (RecycleBinManager.isRecycleBinPath(fullPath)) {
    const isEmpty =
      options.recycleBinEmpty !== undefined
        ? options.recycleBinEmpty
        : await RecycleBinManager.isEmpty();
    iconObj = isEmpty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull;
  }
  // Special handling for items INSIDE Recycle Bin
  else if (RecycleBinManager.isRecycledItemPath(fullPath)) {
    const metadata =
      options.metadata || (await RecycleBinManager.getMetadata());
    const entry = metadata[fileName]; // fileName is the ID
    if (entry) {
      iconObj = getIconObjForFile(entry.originalName, isDir);
      displayName = getDisplayName(entry.originalName);
    }
  }

  const iconImg32 = document.createElement("img");
  iconImg32.src = iconObj[32];
  iconImg32.className = "icon-32";
  iconImg32.draggable = false;
  iconWrapper.appendChild(iconImg32);

  const iconImg16 = document.createElement("img");
  iconImg16.src = iconObj[16];
  iconImg16.className = "icon-16";
  iconImg16.draggable = false;
  iconWrapper.appendChild(iconImg16);

  iconInner.appendChild(iconWrapper);

  const label = document.createElement("div");
  label.className = "icon-label";
  label.textContent = displayName;

  iconDiv.appendChild(iconInner);
  iconDiv.appendChild(label);

  return iconDiv;
}
