import directory from "../config/directory.js";
import { SPECIAL_FOLDER_PATHS } from "../config/special-folders.js";

// Create a reverse map for easy lookup
const reverseSpecialFolderPaths = {};
for (const key in SPECIAL_FOLDER_PATHS) {
  reverseSpecialFolderPaths[SPECIAL_FOLDER_PATHS[key]] = key;
}

export function convertInternalPathToWindows(internalPath) {
  const apps = window.System?.apps || [];
  // Handle root and other special names directly
  if (internalPath === "/") {
    return "My Computer";
  }
  // This will handle "My Documents", "Desktop" etc.
  const specialFolderKey = reverseSpecialFolderPaths[internalPath];
  if (specialFolderKey) {
    const app = apps.find((app) => app.id === specialFolderKey);
    return app ? app.title : "My Computer";
  }

  const parts = internalPath.split("/").filter(Boolean);
  if (parts.length === 0) {
    return "My Computer";
  }

  const pathNodes = [];
  let currentLevel = directory;

  for (const part of parts) {
    const found = currentLevel.find((item) => item.id === part);
    if (found) {
      pathNodes.push(found);
      currentLevel = found.children || [];
    } else {
      const app = apps.find((app) => app.id === part);
      return app ? app.title : "My Computer";
    }
  }

  if (pathNodes.length === 0) {
    return "My Computer";
  }

  // This handles items at the root that aren't drives, e.g., "My Briefcase"
  if (pathNodes[0].type !== "drive") {
    return pathNodes.map((node) => node.name).join("\\");
  }

  // Handle drive paths
  const driveName = pathNodes[0].name; // This is 'C:', 'D:', etc.
  const restOfPath = pathNodes
    .slice(1)
    .map((node) => node.name)
    .join("\\");

  return restOfPath ? `${driveName}\\${restOfPath}` : driveName;
}

export function convertWindowsPathToInternal(windowsPath) {
  const apps = window.System?.apps || [];
  if (windowsPath.toLowerCase() === "my computer") {
    return "/";
  }

  // Check for special folder names like "My Documents"
  for (const key in SPECIAL_FOLDER_PATHS) {
    const app = apps.find((a) => a.id === key);
    if (app && app.title.toLowerCase() === windowsPath.toLowerCase()) {
      return SPECIAL_FOLDER_PATHS[key];
    }
  }

  // Check for root items like "My Briefcase"
  const rootItem = directory.find(
    (item) => item.name.toLowerCase() === windowsPath.toLowerCase(),
  );
  if (rootItem) {
    return `/${rootItem.id}`;
  }

  const parts = windowsPath.split("\\").filter(Boolean);
  if (parts.length === 0) {
    return "/";
  }

  const driveLetter = parts[0];
  const driveNode = directory.find(
    (drive) => drive.name.toLowerCase() === driveLetter.toLowerCase(),
  );

  if (!driveNode) {
    // Check if it's special explorer app (Recycle Bin, Network Neighborhood, etc.)
    const app = apps.find(
      (a) => a.title.toLowerCase() === driveLetter.toLowerCase(),
    );
    if (app) {
      return `//${app.id}`;
    }
    return null; // Invalid drive
  }

  let internalPath = `/${driveNode.id}`;
  let currentLevel = driveNode.children || [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const found = currentLevel.find(
      (item) => item.name.toLowerCase() === part.toLowerCase(),
    );
    if (found) {
      internalPath += `/${found.id}`;
      currentLevel = found.children || [];
    } else {
      return null; // Path not found
    }
  }

  return internalPath;
}
