import { ICONS, SHORTCUT_OVERLAY } from '../../../config/icons.js';
import { getAssociation } from '../../../system/directory.js';
import { getDisplayName, getPathName } from '../navigation/path-utils.js';
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';
import { ShellManager } from '../extensions/shell-manager.js';
import { fs } from "@zenfs/core";
import { apps } from '../../../config/apps.js';
import { getIconSchemeName } from '../../../system/theme-manager.js';
import { iconSchemes } from '../../../config/icon-schemes.js';

/**
 * FileIconRenderer - Handles rendering of file/folder icons in ZenExplorer
 */

/**
 * Get themed icon object for special system folders
 * @param {string} specialType - 'computer', 'recycle', or 'network'
 * @param {boolean} isEmpty - For recycle bin, whether it is empty
 * @returns {Object} Icon object with 16 and 32 sizes
 */
export function getThemedIconObj(specialType, isEmpty = true) {
  const schemeName = getIconSchemeName();
  const scheme = iconSchemes[schemeName] || iconSchemes.default;
  const defaultScheme = iconSchemes.default;

  switch (specialType) {
    case "computer":
      return scheme.myComputer || defaultScheme.myComputer || ICONS.computer;
    case "recycle":
      return isEmpty
        ? scheme.recycleBinEmpty ||
            defaultScheme.recycleBinEmpty ||
            ICONS.recycleBinEmpty
        : scheme.recycleBinFull ||
            defaultScheme.recycleBinFull ||
            ICONS.recycleBinFull;
    case "network":
      return (
        scheme.networkNeighborhood ||
        defaultScheme.networkNeighborhood ||
        ICONS.networkNeighborhood
      );
    default:
      return null;
  }
}

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
  const fileStat =
    options.stat || (await ShellManager.stat(fullPath).catch(() => ({})));

  const iconDiv = document.createElement("div");
  iconDiv.className = "explorer-icon";
  iconDiv.setAttribute("tabindex", "0");
  iconDiv.setAttribute("data-path", fullPath);
  iconDiv.setAttribute("data-type", isDir ? "directory" : "file");
  iconDiv.setAttribute("data-name", fileName);
  iconDiv.setAttribute(
    "data-is-virtual",
    fileStat.isVirtual ? "true" : "false",
  );

  const iconInner = document.createElement("div");
  iconInner.className = "icon";

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "icon-wrapper";

  let iconObj = shellIcon || getIconObjForFile(fileName, isDir);

  // Special handling for Start Menu and Favorites folders in Explorer
  if (isDir && fullPath.includes("/WINDOWS/Start Menu/Programs")) {
    iconObj = ICONS.startMenuFolder;
  }

  if (isDir && fullPath.endsWith("/WINDOWS/Favorites")) {
    iconObj = ICONS.favoritesFolder;
  }

  let displayName = options.stat?.originalName || getDisplayName(fileName);
  let isShortcut = false;

  // Special handling for shortcuts (.lnk files)
  if (!isDir && (fileName.endsWith(".lnk.json") || fileName.endsWith(".lnk"))) {
    isShortcut = true;
    displayName = displayName.replace(".lnk.json", "").replace(".lnk", "");
    try {
      const content = await fs.promises.readFile(
        ShellManager.getRealPath(fullPath),
        "utf8",
      );
      const data = JSON.parse(content);
      if (data.type === "shortcut") {
        if (data.appId) {
          const app = apps.find((a) => a.id === data.appId);
          if (app) {
            iconObj = app.icon;
          }
        } else if (data.targetPath) {
          iconObj = ShellManager.getIconObj(data.targetPath);
          if (!iconObj) {
            try {
              const targetStats = await ShellManager.stat(data.targetPath);
              iconObj = getIconObjForFile(
                getPathName(data.targetPath),
                targetStats.isDirectory(),
              );
            } catch (e) {
              iconObj = ICONS.file;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to read shortcut icon", e);
    }
  }

  // Special handling for My Computer (root or desktop icon)
  if (fullPath === "/" || fullPath === "/Desktop/My Computer") {
    iconObj = getThemedIconObj("computer");
  }
  // Special handling for Network Neighborhood
  else if (
    fullPath === "/Network Neighborhood" ||
    fullPath === "/Desktop/Network Neighborhood"
  ) {
    iconObj = getThemedIconObj("network");
  }
  // Special handling for My Documents
  else if (fullPath === "/Desktop/My Documents") {
    iconObj = ICONS.folder;
  }
  // Special handling for Recycle Bin folder
  else if (RecycleBinManager.isRecycleBinPath(fullPath)) {
    const isEmpty =
      options.recycleBinEmpty !== undefined
        ? options.recycleBinEmpty
        : await RecycleBinManager.isEmpty(fullPath);
    iconObj = getThemedIconObj("recycle", isEmpty);
  }
  // Special handling for items INSIDE Recycle Bin
  else if (RecycleBinManager.isRecycledItemPath(fullPath)) {
    const entry = options.stat?.isVirtual
      ? {
          originalName: options.stat.originalName,
          originalPath: options.stat.originalPath,
        }
      : await RecycleBinManager.getRecycledItemInfo(fullPath);

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
