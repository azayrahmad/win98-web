import { fs } from "@zenfs/core";
import { launchApp } from "./appManager.js";
import { ICONS } from "../config/icons.js";
import { getAssociation } from "./directory.js";
import { existsAsync } from "./zenfs-utils.js";

export const PINNED_PATH = "/C:/WINDOWS/Start Menu";
export const START_MENU_PATH = "/C:/WINDOWS/Start Menu/Programs";
export const FAVORITES_PATH = "/C:/WINDOWS/Favorites";

/**
 * Migrates a menu configuration to ZenFS as directories and .lnk files
 * @param {Array} config - The submenu config array
 * @param {string} targetPath - The ZenFS path to migrate to
 */
export async function migrateToZenFS(config, targetPath) {
  if (!(await existsAsync(targetPath))) {
    await fs.promises.mkdir(targetPath, { recursive: true });
  }

  for (const item of config) {
    if (item.submenu) {
      const dirPath = `${targetPath}/${item.label}`;
      if (!(await existsAsync(dirPath))) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      await migrateToZenFS(item.submenu, dirPath);
    } else if (item.appId) {
      // Create a shortcut
      const lnkPath = `${targetPath}/${item.label}.lnk`;
      const lnkData = {
        type: "shortcut",
        appId: item.appId,
        args: item.args || null,
      };
      await fs.promises.writeFile(lnkPath, JSON.stringify(lnkData, null, 2));
    } else if (item.label === "Windows Explorer") {
        // Special case for Windows Explorer which has an action but no appId in config
        const lnkPath = `${targetPath}/${item.label}.lnk`;
        const lnkData = {
          type: "shortcut",
          appId: "my-computer",
        };
        await fs.promises.writeFile(lnkPath, JSON.stringify(lnkData, null, 2));
    }
  }
}

/**
 * Reads a .lnk file and returns a menu item action
 * @param {string} path - Path to the .lnk file
 * @param {number} iconSize - The size of the icon to return (16 or 32)
 * @returns {Promise<Object>} Menu item properties
 */
export async function loadLnk(path, iconSize = 16) {
  try {
    const filename = path.split("/").pop();
    const label = filename.replace(".lnk", "");
    const content = await fs.promises.readFile(path, "utf8");
    const data = JSON.parse(content);
    const { apps } = await import("../config/apps.js");
    const app = apps.find((a) => a.id === data.appId);

    return {
      label: label,
      icon: app ? app.icon[iconSize] : ICONS.file[iconSize],
      action: () => launchApp(data.appId, data.args),
    };
  } catch (error) {
    console.error(`Failed to load shortcut: ${path}`, error);
    return null;
  }
}

/**
 * Builds pinned items list from a ZenFS directory (shortcuts only)
 * @param {string} path - The ZenFS directory path
 * @returns {Promise<Array>} Array of menu items
 */
export async function getPinnedItemsFromZenFS(path = PINNED_PATH) {
  try {
    if (!(await existsAsync(path))) {
      return [];
    }

    const files = await fs.promises.readdir(path);
    const menuItems = [];

    for (const file of files) {
      if (file === "Programs" || file === ".zen_layout.json" || file === ".metadata.json") continue;

      const fullPath = `${path}/${file}`;
      const stat = await fs.promises.stat(fullPath);

      if (!stat.isDirectory() && file.endsWith(".lnk")) {
        const item = await loadLnk(fullPath, 32);
        if (item) {
          menuItems.push(item);
        }
      }
    }

    return menuItems.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error(`Failed to read pinned items from ZenFS: ${path}`, error);
    return [];
  }
}

/**
 * Recursively builds a menu structure from a ZenFS directory
 * @param {string} path - The ZenFS directory path
 * @returns {Promise<Array>} Array of menu items
 */
export async function getMenuFromZenFS(path) {
  try {
    if (!(await existsAsync(path))) {
      return [];
    }

    const files = await fs.promises.readdir(path);
    const menuItems = [];

    for (const file of files) {
      if (file === ".zen_layout.json" || file === ".metadata.json") continue;

      const fullPath = `${path}/${file}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        menuItems.push({
          label: file,
          icon: ICONS.programs[16],
          submenu: await getMenuFromZenFS(fullPath),
        });
      } else if (file.endsWith(".lnk")) {
        const item = await loadLnk(fullPath);
        if (item) {
          menuItems.push(item);
        }
      } else {
        // Handle regular files as notepad associations
        const association = getAssociation(file);
        menuItems.push({
            label: file,
            icon: association.icon[16],
            action: () => launchApp(association.appId, fullPath)
        });
      }
    }

    // Sort: directories first, then alphabetically
    return menuItems.sort((a, b) => {
      const aIsDir = !!a.submenu;
      const bIsDir = !!b.submenu;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.label.localeCompare(b.label);
    });
  } catch (error) {
    console.error(`Failed to read menu from ZenFS: ${path}`, error);
    return [];
  }
}
