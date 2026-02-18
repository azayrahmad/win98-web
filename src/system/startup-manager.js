import { getItem, setItem } from './local-storage.js';
import { fs } from "@zenfs/core";
import { START_MENU_PATH } from '../shell/start-menu/start-menu-utils.js';
import { apps } from '../config/apps.js';
import { existsAsync } from './zenfs-utils.js';

const STARTUP_APPS_KEY = "startup_apps";
const STARTUP_PATH = `${START_MENU_PATH}/StartUp`;

/**
 * Gets the list of startup app IDs from ZenFS and localStorage (fallback).
 * @returns {Promise<string[]>} An array of app IDs.
 */
export async function getStartupApps() {
  const appIds = new Set();

  // 1. Read from ZenFS
  try {
    if (await existsAsync(STARTUP_PATH)) {
      const files = await fs.promises.readdir(STARTUP_PATH);
      for (const file of files) {
        if (file.endsWith(".lnk.json")) {
          const content = await fs.promises.readFile(`${STARTUP_PATH}/${file}`, "utf8");
          const data = JSON.parse(content);
          if (data.appId) {
            appIds.add(data.appId);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to read startup apps from ZenFS", error);
  }

  // 2. Read from localStorage (for backwards compatibility if migration failed or hasn't run)
  const localApps = getItem(STARTUP_APPS_KEY) || [];
  localApps.forEach(id => appIds.add(id));

  return Array.from(appIds);
}

/**
 * Adds an app ID to the startup list.
 * @param {string} appId The ID of the app to add.
 */
export async function addStartupApp(appId) {
  // Add to ZenFS
  try {
    if (!(await existsAsync(STARTUP_PATH))) {
      await fs.promises.mkdir(STARTUP_PATH, { recursive: true });
    }
    const app = apps.find(a => a.id === appId);
    const label = app ? app.title : appId;
    const lnkPath = `${STARTUP_PATH}/${label}.lnk.json`;

    if (!(await existsAsync(lnkPath))) {
      await fs.promises.writeFile(lnkPath, JSON.stringify({
        type: "shortcut",
        appId: appId,
      }, null, 2));
    }
  } catch (error) {
    console.error("Failed to add startup app to ZenFS", error);
  }

  // Still add to localStorage for now to be safe
  const currentApps = getItem(STARTUP_APPS_KEY) || [];
  if (!currentApps.includes(appId)) {
    const newApps = [...currentApps, appId];
    setItem(STARTUP_APPS_KEY, newApps);
  }
}

/**
 * Removes an app ID from the startup list.
 * @param {string} appId The ID of the app to remove.
 */
export async function removeStartupApp(appId) {
  // Remove from ZenFS
  try {
    if (await existsAsync(STARTUP_PATH)) {
      const files = await fs.promises.readdir(STARTUP_PATH);
      for (const file of files) {
        if (file.endsWith(".lnk.json")) {
          const content = await fs.promises.readFile(`${STARTUP_PATH}/${file}`, "utf8");
          const data = JSON.parse(content);
          if (data.appId === appId) {
            await fs.promises.unlink(`${STARTUP_PATH}/${file}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to remove startup app from ZenFS", error);
  }

  // Remove from localStorage
  const currentApps = getItem(STARTUP_APPS_KEY) || [];
  const newApps = currentApps.filter((id) => id !== appId);
  setItem(STARTUP_APPS_KEY, newApps);
}
