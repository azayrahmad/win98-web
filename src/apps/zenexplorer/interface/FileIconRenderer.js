import { ICONS, SHORTCUT_OVERLAY } from "../../../config/icons.js";
import { getAssociation } from "../../../utils/directory.js";
import { getDisplayName } from "../navigation/PathUtils.js";
import { RecycleBinManager } from "../fileoperations/RecycleBinManager.js";
import { ShellManager } from "../extensions/ShellManager.js";
import { fs } from "@zenfs/core";

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
    if (fileName.match(/^C:$/i)) {
      return ICONS.drive;
    }
    if (fileName.match(/^[A-Z]:$/i)) {
      return ICONS.removableDrive;
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
  // Check shell extension icon first
  const shellIcon = ShellManager.getIconObj(fullPath);
  const fileStat = options.stat || await ShellManager.stat(fullPath).catch(() => ({}));

  const iconDiv = document.createElement("div");
  iconDiv.className = "explorer-icon";
  iconDiv.setAttribute("tabindex", "0");
  iconDiv.setAttribute("data-path", fullPath);
  iconDiv.setAttribute("data-type", isDir ? "directory" : "file");
  iconDiv.setAttribute("data-name", fileName);
  iconDiv.setAttribute("data-is-virtual", fileStat.isVirtual ? "true" : "false");

  const iconInner = document.createElement("div");
  iconInner.className = "icon";

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "icon-wrapper";

  let iconObj = shellIcon || getIconObjForFile(fileName, isDir);

  // Special handling for Start Menu and Favorites folders in Explorer
  if (isDir && (fullPath.includes("/WINDOWS/Start Menu") || fullPath.includes("/WINDOWS/Favorites"))) {
    iconObj = ICONS.programs;
  }

  let displayName = getDisplayName(fileName);
  let isShortcut = false;

  // Special handling for shortcuts (.lnk files)
  if (!isDir && fileName.endsWith(".lnk")) {
    isShortcut = true;
    try {
      const content = await fs.promises.readFile(fullPath, "utf8");
      const data = JSON.parse(content);
      if (data.type === "shortcut" && data.appId) {
        const { apps } = await import("../../../config/apps.js");
        const app = apps.find((a) => a.id === data.appId);
        if (app) {
          iconObj = app.icon;
        }
      }
    } catch (e) {
      console.error("Failed to read shortcut icon", e);
    }
  }

  // Special handling for Recycle Bin folder
  if (RecycleBinManager.isRecycleBinPath(fullPath)) {
    const isEmpty =
      options.recycleBinEmpty !== undefined
        ? options.recycleBinEmpty
        : await RecycleBinManager.isEmpty(fullPath);
    iconObj = isEmpty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull;
  }
  // Special handling for items INSIDE Recycle Bin
  else if (RecycleBinManager.isRecycledItemPath(fullPath)) {
    const recyclePath = RecycleBinManager.getRecyclePath(fullPath);
    const metadata =
      options.metadata || (recyclePath ? await RecycleBinManager.getMetadata(recyclePath) : {});
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

  if (isShortcut) {
    const overlayImg32 = document.createElement("img");
    overlayImg32.src = SHORTCUT_OVERLAY[32];
    overlayImg32.className = "shortcut-overlay shortcut-overlay-32 icon-32";
    overlayImg32.draggable = false;
    iconWrapper.appendChild(overlayImg32);

    const overlayImg16 = document.createElement("img");
    overlayImg16.src = SHORTCUT_OVERLAY[16];
    overlayImg16.className = "shortcut-overlay shortcut-overlay-16 icon-16";
    overlayImg16.draggable = false;
    iconWrapper.appendChild(overlayImg16);
  }

  iconInner.appendChild(iconWrapper);

  const label = document.createElement("div");
  label.className = "icon-label";
  label.textContent = displayName;

  iconDiv.appendChild(iconInner);
  iconDiv.appendChild(label);

  return iconDiv;
}
