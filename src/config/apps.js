// src/config/apps.js
import { FlashPlayerApp } from "../apps/flashplayer/FlashPlayerApp.js";
import { ShowDialogWindow } from "../components/DialogWindow.js";
import { getIcon } from "../utils/iconManager.js";
import { playSound } from "../utils/soundManager.js";
import {
  getRecycleBinItems,
  emptyRecycleBin,
} from "../utils/recycleBinManager.js";
import { SPECIAL_FOLDER_PATHS } from "./special-folders.js";

export const apps = [];
export const appClasses = {};
const staticConfigs = [];

// --- Dynamic App Loading ---

// Use Vite's glob import to get all App modules
const appModules = import.meta.glob("../apps/*/*App.js", { eager: true });

for (const path in appModules) {
  const appModule = appModules[path];
  let AppClass = null;

  // Check for a named export ending in 'App'
  const appClassName = Object.keys(appModule).find((key) =>
    key.endsWith("App"),
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
          filePath: "//recycle-bin",
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
            buttons: [
              {
                label: "Yes",
                action: () => {
                  emptyRecycleBin();
                  playSound("EmptyRecycleBin");
                  document.dispatchEvent(new CustomEvent("theme-changed")); // To refresh icon
                },
              },
              { label: "No", isDefault: true },
            ],
          });
        },
        enabled: () => getRecycleBinItems().length > 0,
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
          filePath: "//network-neighborhood",
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
          filePath: "/folder-control-panel",
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

if (FlashPlayerApp.config) {
  appClasses[FlashPlayerApp.config.id] = FlashPlayerApp;
  staticConfigs.push({ ...FlashPlayerApp.config, appClass: FlashPlayerApp });
}

apps.push(...systemApps, ...staticConfigs);
