import { fs } from "@zenfs/core";
import { apps } from '../../config/apps.js';
import { launchApp } from '../../system/app-manager.js';
import { ICONS } from '../../config/icons.js';
import { getAssociation } from '../../system/directory.js';
import { existsAsync } from '../../system/zenfs-utils.js';
import { ShellManager } from '../../shell/explorer/extensions/shell-manager.js';

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
      const lnkPath = `${targetPath}/${item.label}.lnk.json`;
      const lnkData = {
        type: "shortcut",
        appId: item.appId,
        args: item.args || null,
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
    const label = filename.replace(".lnk.json", "").replace(".lnk", "");
    const content = await fs.promises.readFile(path, "utf8");
    const data = JSON.parse(content);

    if (data.appId) {
      const app = apps.find((a) => a.id === data.appId);
      let icon = app ? app.icon[iconSize] : ICONS.file[iconSize];

      if (data.appId === "internet-explorer" && path.toLowerCase().includes("favorites")) {
        icon = ICONS.htmlFile[iconSize];
      }

      return {
        label: label,
        icon: icon,
        action: () => launchApp(data.appId, data.args),
        appId: data.appId,
        args: data.args,
      };
    } else if (data.targetPath) {
      const targetName = data.targetPath.split("/").pop();
      let icon = ICONS.file[iconSize];
      let action = () => {};
      let appId = "explorer";
      let args = data.targetPath;

      try {
        const stats = await ShellManager.stat(data.targetPath);
        if (stats.isDirectory()) {
          icon = ICONS.folderClosed[iconSize];
          action = () => launchApp("explorer", data.targetPath);
        } else {
          const association = getAssociation(targetName);
          if (association) {
            appId = association.appId;
            args = ShellManager.getRealPath(data.targetPath);
            icon = association.icon[iconSize];
            action = () => launchApp(appId, args);
          } else {
            appId = "notepad";
            args = ShellManager.getRealPath(data.targetPath);
            icon = ICONS.file[iconSize];
            action = () => launchApp(appId, args);
          }
        }
      } catch (e) {
        console.warn(`Shortcut target not found: ${data.targetPath}`);
      }

      return {
        label: label,
        icon: icon,
        action: action,
        appId,
        args,
        targetPath: data.targetPath,
      };
    }

    return null;
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

      if (!stat.isDirectory() && file.endsWith(".lnk.json")) {
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
 * Refreshes the Programs menu by ensuring shortcuts exist for all apps with a category.
 * It also cleans up shortcuts that refer to non-existent applications.
 */
export async function refreshPrograms() {
  if (!(await existsAsync(START_MENU_PATH))) {
    await fs.promises.mkdir(START_MENU_PATH, { recursive: true });
  }

  // 1. Cleanup: Remove invalid shortcuts
  const appIds = new Set(apps.map(app => app.id));

  async function cleanupDir(dirPath) {
    if (!(await existsAsync(dirPath))) return;

    const entries = await fs.promises.readdir(dirPath);
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await cleanupDir(fullPath);
        // Optionally remove empty directory if it's not the root
        if (fullPath !== START_MENU_PATH) {
          const remaining = await fs.promises.readdir(fullPath);
          if (remaining.length === 0) {
            await fs.promises.rmdir(fullPath);
          }
        }
      } else if (entry.endsWith(".lnk.json")) {
        try {
          const content = await fs.promises.readFile(fullPath, "utf8");
          const data = JSON.parse(content);
          if (data.type === "shortcut" && data.appId && !appIds.has(data.appId)) {
            console.log(`Removing invalid shortcut: ${fullPath} (appId: ${data.appId})`);
            await fs.promises.unlink(fullPath);
          }
        } catch (e) {
          console.warn(`Failed to validate shortcut ${fullPath}:`, e);
        }
      }
    }
  }

  await cleanupDir(START_MENU_PATH);

  // 2. Addition: Ensure shortcuts exist for all current apps
  for (const app of apps) {
    // Only include apps that have a category defined (including empty string)
    // As per requirement, undefined/null categories are skipped.
    if (app.category !== undefined && app.category !== null) {
      const categories = Array.isArray(app.category) ? app.category : [app.category];

      for (const category of categories) {
        let targetDir = START_MENU_PATH;
        if (category) {
          // Categories can be nested like "Accessories/Games"
          targetDir += `/${category}`;
        }

        if (!(await existsAsync(targetDir))) {
          await fs.promises.mkdir(targetDir, { recursive: true });
        }

        const lnkPath = `${targetDir}/${app.title}.lnk.json`;
        if (!(await existsAsync(lnkPath))) {
          const lnkData = {
            type: "shortcut",
            appId: app.id,
            args: app.args || null,
          };
          await fs.promises.writeFile(lnkPath, JSON.stringify(lnkData, null, 2));
        }
      }
    }
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
      } else if (file.endsWith(".lnk.json")) {
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
