import { fileAssociations } from '../config/file-associations.js';
import { getRecycleBinItems } from './recycle-bin-utils.js';
import { networkNeighborhood } from '../config/network-neighborhood.js';
import { floppyManager } from './floppy-manager.js';
import { apps } from '../config/apps.js';

export function getAssociation(filename: string): any {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return (fileAssociations as any)[extension] || fileAssociations.default;
}

export function findItemByPath(path: string): any {
  if (path === "//recycle-bin") {
    const recycledItems = getRecycleBinItems();
    return {
      id: "recycle-bin",
      name: "Recycle Bin",
      type: "folder",
      children: recycledItems.map((item: any) => ({
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
      children: networkNeighborhood.map((item: any) => ({
        ...item,
        id: item.title.toLowerCase().replace(/\s+/g, "-"),
        name: item.title,
        type: "network",
      })),
    };
  }

  // Handle virtual shell paths (legacy)
  if (path?.startsWith("//")) {
    const appId = path.substring(2);
    const app = apps.find((a: any) => a.id === appId);
    if (app) {
      return {
        id: app.id,
        name: app.title,
        type: "app",
        icon: app.icon,
      };
    }
  }

  // Handle floppy drive
  if (path === "/A:" || path === "A:") {
    return {
      id: "floppy-drive",
      name: floppyManager.getFolderName() || "3½ Floppy (A:)",
      type: "folder",
      children: floppyManager.getContents() || [],
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
