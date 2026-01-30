import { ICONS, SHORTCUT_OVERLAY } from "../../../config/icons.js";
import { getAssociation } from "../../../utils/directory.js";
import { getDisplayName } from "../utils/PathUtils.js";
import { RecycleBinManager } from "../utils/RecycleBinManager.js";
import { ZenShellManager } from "../utils/ZenShellManager.js";
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
  const shellIcon = await ZenShellManager.getIconObj(fullPath);

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

  let iconObj = shellIcon || getIconObjForFile(fileName, isDir);

  // Special handling for My Documents
  if (fullPath === "/C:/My Documents" || fileName === "My Documents") {
    iconObj = ICONS.documents;
  }

  // Theme icons support for desktop
  if (options.useThemeIcons) {
    try {
      const { getIconSchemeName } = await import(
        "../../../utils/themeManager.js"
      );
      const { iconSchemes } = await import("../../../config/icon-schemes.js");
      const schemeName = getIconSchemeName();
      const scheme = iconSchemes[schemeName] || iconSchemes.default;

      if (fullPath.endsWith("/My Computer") || fullPath === "/") {
        iconObj = scheme.myComputer;
      } else if (fullPath === "/C:/My Documents" || fileName === "My Documents") {
        if (scheme.myDocuments) {
          iconObj = scheme.myDocuments;
        }
      } else if (fullPath.endsWith("/Recycle Bin")) {
        const isEmpty =
          options.recycleBinEmpty !== undefined
            ? options.recycleBinEmpty
            : await RecycleBinManager.isEmpty();
        iconObj = isEmpty ? scheme.recycleBinEmpty : scheme.recycleBinFull;
      } else if (fullPath.endsWith("/Network Neighborhood")) {
        iconObj = scheme.networkNeighborhood;
      }
    } catch (e) {
      console.error("Failed to load theme icons", e);
    }
  }

  let displayName = getDisplayName(fileName);
  let isShortcut = fileName.toLowerCase().endsWith(".lnk");

  if (isShortcut && !isDir) {
    try {
      const content = await fs.promises.readFile(fullPath, "utf8");
      const data = JSON.parse(content);
      if (data.type === "shortcut" && data.appId) {
        const { apps } = await import("../../../config/apps.js");
        const app = apps.find((a) => a.id === data.appId);
        if (app) {
          iconObj = app.icon;
          displayName = getDisplayName(fileName.slice(0, -4));
        }
      }
    } catch (e) {}
  }

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

  if (isShortcut) {
    const overlay32 = document.createElement("img");
    overlay32.src = SHORTCUT_OVERLAY[32];
    overlay32.className = "shortcut-overlay icon-32";
    iconWrapper.appendChild(overlay32);

    const overlay16 = document.createElement("img");
    overlay16.src = SHORTCUT_OVERLAY[16];
    overlay16.className = "shortcut-overlay icon-16";
    iconWrapper.appendChild(overlay16);
  }

  iconInner.appendChild(iconWrapper);

  const label = document.createElement("div");
  label.className = "icon-label";
  label.textContent = displayName;

  iconDiv.appendChild(iconInner);
  iconDiv.appendChild(label);

  return iconDiv;
}
