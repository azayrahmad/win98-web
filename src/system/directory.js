import { apps } from '../config/apps.js';
import { fileAssociations } from '../config/file-associations.js';
import { getRecycleBinItems } from './recycle-bin-utils.js';
import { networkNeighborhood } from '../config/network-neighborhood.js';
import { floppyManager } from './floppy-manager.js';

export function getAssociation(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  return fileAssociations[extension] || fileAssociations.default;
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

  // Legacy fallback for My Computer
  if (!path || path === "/") {
    return {
      id: "root",
      name: "My Computer",
      type: "folder",
      children: [],
    };
  }

  return null;
}
