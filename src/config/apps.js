// src/config/apps.js
import { FlashPlayerApp } from '../apps/flash-player/flash-player-app.js';
import { ZenExplorerApp } from '../shell/explorer/explorer-app.js';
import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { getIcon } from '../shared/utils/icon-resolver.js';
import { playSound } from '../system/sound-manager.js';
import {
  getRecycleBinItems,
  emptyRecycleBin,
} from '../system/recycle-bin-utils.js';
import { SPECIAL_FOLDER_PATHS } from './special-folders.js';

// --- Dynamic App Loading ---

// Use Vite's glob import to get all App modules
const appModules = import.meta.glob("../apps/*/*-app.js", { eager: true });

export const appClasses = {};
const staticConfigs = [];

for (const path in appModules) {
  const appModule = appModules[path];
  let AppClass = null;

  // Check for a named export ending in 'App'
  const appClassName = Object.keys(appModule).find((key) =>
    key.toLowerCase().endsWith("app"),
  );
  if (appClassName) {
    AppClass = appModule[appClassName];
  }
  // If not found, check for a default export
  else if (appModule.default) {
    AppClass = appModule.default;
  }

  if (AppClass && AppClass.config) {
    const configs = Array.isArray(AppClass.config)
      ? AppClass.config
      : [AppClass.config];
    configs.forEach((config) => {
      if (config.id) {
        appClasses[config.id] = AppClass;
        staticConfigs.push({ ...config, appClass: AppClass });
      }
    });
  }
}

// --- Static & System App Definitions ---

const systemApps = [
  {
    id: "my-computer",
    title: "My Computer",
    description: "Browse the files and folders on your computer.",
    get icon() {
      return getIcon("myComputer");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/",
          windowId: "my-computer",
        });
      },
    },
  },
  {
    id: "internet-explorer",
    title: "Internet Explorer",
    description: "Browse the web.",
    get icon() {
      return getIcon("internet-explorer");
    },
    action: {
      type: "function",
      handler: (data) => {
        window.System.launchApp("explorer", data || "azay.rahmad");
      },
    },
  },
  {
    id: "my-briefcase",
    title: "My Briefcase",
    description: "Stores your uploaded files.",
    get icon() {
      return getIcon("briefcase");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/folder-briefcase",
          windowId: "my-briefcase",
        });
      },
    },
  },
  {
    id: "recycle-bin",
    title: "Recycle Bin",
    description:
      "Contains files and folders that you have deleted. They can be recovered or permanently removed.",
    get icon() {
      const items = getRecycleBinItems();
      return items.length > 0
        ? getIcon("recycleBinFull")
        : getIcon("recycleBinEmpty");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/Recycle Bin",
          windowId: "recycle-bin",
        });
      },
    },
    contextMenu: [
      {
        label: "Empty Recycle Bin",
        action: () => {
          ShowDialogWindow({
            title: "Confirm Empty Recycle Bin",
            text: "Are you sure you want to permanently delete all items in the Recycle Bin?",
            modal: true,
            buttons: [
              {
                label: "Yes",
                isDefault: true,
                action: async () => {
                  if (window.RecycleBinManager) {
                    await window.RecycleBinManager.emptyAllRecycleBins();
                    const { playSound } = await import('../system/sound-manager.js');
                    playSound("EmptyRecycleBin");
                  }
                },
              },
              { label: "No" },
            ],
          });
        },
        enabled: () => {
            // This is tricky because apps.js is outside the extension system's usual context
            // and getRecycleBinItems might be old.
            // For now, let's keep it simple.
            return true;
        },
      },
      "MENU_DIVIDER",
      {
        label: "&Open",
        action: "open",
        default: true,
      },
      {
        label: "&Properties",
        action: "properties",
      },
    ],
  },
  {
    id: "network-neighborhood",
    title: "Network Neighborhood",
    description: "Browse network resources.",
    get icon() {
      return getIcon("networkNeighborhood");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/Network Neighborhood",
          windowId: "network-neighborhood",
        });
      },
    },
  },
  {
    id: "my-documents",
    title: "My Documents",
    description: "A common repository for documents.",
    get icon() {
      return getIcon("folder");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: SPECIAL_FOLDER_PATHS["my-documents"],
          windowId: "my-documents",
        });
      },
    },
  },
  {
    id: "control-panel",
    title: "Control Panel",
    description: "Access system settings and utilities.",
    get icon() {
      return getIcon("controlPanel");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/Control Panel",
          windowId: "control-panel",
        });
      },
    },
  },
  {
    id: "songs",
    title: "songs",
    description: "A shortcut to the songs folder.",
    get icon() {
      return getIcon("folderClosed");
    },
    action: {
      type: "function",
      handler: () => {
        window.System.launchApp("explorer", {
          filePath: "/drive-d/folder-songs",
          windowId: "songs",
        });
      },
    },
  },
  {
    id: "alertTest",
    title: "Alert Test",
    description: "A test for the alert dialog.",
    get icon() {
      return getIcon("about");
    },
    action: {
      type: "function",
      handler: () => {
        ShowDialogWindow({
          title: "Alert",
          text: "The alert works.",
          soundEvent: "SystemHand",
          get contentIconUrl() {
            return getIcon("about", 32);
          },
          buttons: [{ label: "OK", isDefault: true }],
        });
      },
    },
  },
];

// --- Combine and Export ---

// --- Combine and Export ---

if (FlashPlayerApp.config) {
  appClasses[FlashPlayerApp.config.id] = FlashPlayerApp;
  staticConfigs.push({ ...FlashPlayerApp.config, appClass: FlashPlayerApp });
}

if (ZenExplorerApp.config) {
  appClasses[ZenExplorerApp.config.id] = ZenExplorerApp;
  staticConfigs.push({ ...ZenExplorerApp.config, appClass: ZenExplorerApp });
}

export const apps = [...systemApps, ...staticConfigs];
