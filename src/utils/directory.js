import directory from "../config/directory.js";
import { apps } from "../config/apps.js";
import { fileAssociations } from "../config/fileAssociations.js";
import { getRecycleBinItems } from "./recycleBinManager.js";
import { networkNeighborhood } from "../config/networkNeighborhood.js";
import { floppyManager } from "./floppyManager.js";

export function getAssociation(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  return fileAssociations[extension] || fileAssociations.default;
}

function findFloppyItemByPath(pathParts) {
  let currentLevel = floppyManager.getContents();
  if (!currentLevel) {
    return null;
  }

  let foundItem = null;
  for (const part of pathParts) {
    const item = currentLevel.find((item) => item.name === part);
    if (item) {
      foundItem = item;
      currentLevel = item.children || [];
    } else {
      return null; // Not found
    }
  }

  return foundItem;
}

function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findDesktopFolder() {
  const driveC = directory.find((d) => d.id === "drive-c");
  if (driveC && driveC.children) {
    const userFolder = driveC.children.find((f) => f.id === "folder-user");
    if (userFolder && userFolder.children) {
      return userFolder.children.find((f) => f.id === "folder-desktop");
    }
  }
  return null;
}

function findProgramFilesFolder() {
  const driveC = directory.find((d) => d.id === "drive-c");
  if (driveC && driveC.children) {
    return driveC.children.find((f) => f.id === "folder-program-files");
  }
  return null;
}

export function getDesktopContents() {
  const desktopFolder = findDesktopFolder();
  if (!desktopFolder || !desktopFolder.children) {
    return { apps: [], files: [] };
  }

  const desktopApps = [];
  const desktopFiles = [];
  desktopFolder.children.forEach((item) => {
    if (item.type === "app") {
      const appConfig = apps.find((a) => a.id === item.appId);
      if (appConfig) {
        desktopApps.push(appConfig.id);
      }
    } else if (item.type === "shortcut") {
      const targetNode = findNodeById(directory, item.targetId);
      if (targetNode && targetNode.type === "app") {
        const appConfig = apps.find((a) => a.id === targetNode.appId);
        if (appConfig) {
          desktopFiles.push({
            filename: item.name,
            app: appConfig.id,
            path: `/${item.id}`,
            type: "shortcut",
            icon: appConfig.icon,
          });
        }
      }
    } else if (item.type === "file") {
      const association = getAssociation(item.name);
      desktopFiles.push({
        filename: item.name,
        app: association.appId,
        path: item.contentUrl,
      });
    }
  });

  return { apps: desktopApps, files: desktopFiles };
}

export function addAppDefinition(appId) {
  const programFilesFolder = findProgramFilesFolder();
  if (programFilesFolder && programFilesFolder.children) {
    const appDefinition = { id: `app-${appId}`, type: "app", appId: appId };
    const exists = programFilesFolder.children.some(
      (c) => c.id === appDefinition.id,
    );
    if (!exists) {
      programFilesFolder.children.push(appDefinition);
    }
    return appDefinition.id;
  }
  return null;
}

export function removeAppDefinition(appId) {
  const programFilesFolder = findProgramFilesFolder();
  if (programFilesFolder && programFilesFolder.children) {
    const appDefId = `app-${appId}`;
    const index = programFilesFolder.children.findIndex(
      (c) => c.id === appDefId,
    );
    if (index > -1) {
      programFilesFolder.children.splice(index, 1);
    }
  }
}

export function findItemByPath(path) {
  if (path === "//recycle-bin") {
    const recycledItems = getRecycleBinItems();
    return {
      id: "recycle-bin",
      name: "Recycle Bin",
      type: "folder",
      children: recycledItems.map((item) => ({
        ...item,
        name: item.name || item.title,
        type: item.type || "file",
      })),
    };
  }

  if (path.startsWith("/drive-a")) {
    const parts = path.split("/").filter(Boolean);
    const floppyPath = parts.slice(1);
    const floppyRoot = directory.find((item) => item.id === "drive-a");
    const floppyItem = findFloppyItemByPath(floppyPath);

    if (floppyPath.length === 0) {
      return {
        ...floppyRoot,
        children: floppyManager.getContents(),
      };
    }
    return floppyItem;
  }

  if (path === "//network-neighborhood") {
    return {
      id: "network-neighborhood",
      name: "Network Neighborhood",
      type: "folder",
      children: networkNeighborhood.map((item) => ({
        ...item,
        id: item.title.toLowerCase().replace(/\s+/g, "-"),
        name: item.title,
        type: "network",
      })),
    };
  }

  if (!path || path === "/") {
    const children = directory.filter((item) => item.type !== "briefcase");

    return {
      id: "root",
      name: "My Computer",
      type: "folder",
      children: children,
    };
  }

  const parts = path.split("/").filter(Boolean);
  let currentLevel = directory;
  let currentItem = null;

  for (const part of parts) {
    const found = currentLevel.find(
      (item) => item.name === part || item.id === part,
    );
    if (found) {
      currentItem = found;
      currentLevel = found.children || [];
    } else {
      return null; // Not found
    }
  }

  return currentItem;
}

export function addDesktopShortcut(appId, appTitle) {
  const targetId = addAppDefinition(appId); // Ensure app def exists
  const desktopFolder = findDesktopFolder();

  if (desktopFolder && desktopFolder.children && targetId) {
    const shortcut = {
      id: `shortcut-to-${appId}`,
      type: "shortcut",
      targetId: targetId,
      name: appTitle,
    };
    const exists = desktopFolder.children.some((c) => c.id === shortcut.id);
    if (!exists) {
      desktopFolder.children.push(shortcut);
    }
  }
}

export function removeDesktopShortcut(appId) {
  removeAppDefinition(appId); // Also remove the app def
  const desktopFolder = findDesktopFolder();
  if (desktopFolder && desktopFolder.children) {
    const shortcutId = `shortcut-to-${appId}`;
    const index = desktopFolder.children.findIndex((c) => c.id === shortcutId);
    if (index > -1) {
      desktopFolder.children.splice(index, 1);
    }
  }
}
