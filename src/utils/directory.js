import directory from "../config/directory.js";
import { fileAssociations } from "../config/fileAssociations.js";
import { getRecycleBinItems } from "./recycleBinManager.js";
import { networkNeighborhood } from "../config/networkNeighborhood.js";
import { floppyManager } from "./floppyManager.js";

export function getAssociation(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  return fileAssociations[extension] || fileAssociations.default;
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
    return [];
  }

  const systemIcons = new Set([
    "my-computer",
    "my-documents",
    "recycle-bin",
    "network-neighborhood",
    "my-briefcase",
  ]);

  const desktopItems = desktopFolder.children.map((item) => {
    if (item.type === "app") {
        return null; // Skip apps in legacy desktop contents to avoid circular dependency
    } else if (item.type === "shortcut") {
        return null; // Skip shortcuts in legacy desktop contents
    } else if (item.type === "file") {
      const association = getAssociation(item.name);
      return {
        id: item.id,
        name: item.name,
        type: "file",
        app: association.appId,
        path: item.contentUrl,
      };
    } else if (item.type === "folder") {
      return {
        id: item.id,
        name: item.name,
        type: "folder",
        app: "explorer",
        path: `/drive-c/folder-user/folder-desktop/${item.id}`,
      };
    }
    return null;
  });

  return desktopItems.filter(Boolean);
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
    let listToSearch = currentLevel;

    // specific handling for floppy traversal
    if (currentItem && currentItem.type === "floppy") {
      const floppyContents = floppyManager.getContents();
      if (floppyContents) {
        listToSearch = floppyContents;
      }
    }

    const found = listToSearch.find(
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
