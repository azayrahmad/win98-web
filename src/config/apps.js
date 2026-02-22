// src/config/apps.js
import { ZenExplorerApp } from '../shell/explorer/explorer-app.js';
import { ShellProcess } from '../shell/shell-process.js';
import { kernel } from '../system/kernel.js';
import { getIcon } from '../shared/utils/icon-resolver.js';
import {
  getRecycleBinItems,
} from '../system/recycle-bin-utils.js';
import { SPECIAL_FOLDER_PATHS } from './special-folders.js';
import { appRegistry } from './app-registry.js';

// --- Dynamic App Loading ---

export const appClasses = {};
const staticConfigs = [];

for (const key in appRegistry) {
  const { config, importApp } = appRegistry[key];
  const configs = Array.isArray(config) ? config : [config];
  configs.forEach((c) => {
    if (c.id) {
      appClasses[c.id] = importApp;
      staticConfigs.push({ ...c, appClass: importApp });
    }
  });
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
    description: "Browse the web.", category: "",
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
          kernel.use('ui').showDialog({
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
        kernel.use('ui').showDialog({
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
  {
    id: "windows-update",
    title: "Windows Update",
    description: "Update the web app to the latest version.",
    get icon() {
      return getIcon("windowsUpdate");
    },
    action: {
      type: "function",
      handler: async () => {
        const { showUpdateConfirmation } = await import("../system/update-manager.js");
        await showUpdateConfirmation();
      },
    },
  },
];

// --- Combine and Export ---

if (ZenExplorerApp.config) {
  appClasses[ZenExplorerApp.config.id] = ZenExplorerApp;
  staticConfigs.push({ ...ZenExplorerApp.config, appClass: ZenExplorerApp });
}

if (ShellProcess.config) {
  appClasses[ShellProcess.config.id] = ShellProcess;
  staticConfigs.push({ ...ShellProcess.config, appClass: ShellProcess });
}

export const apps = [...systemApps, ...staticConfigs];
