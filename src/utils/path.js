import directory from "../config/directory.js";
import { SPECIAL_FOLDER_PATHS } from "../config/special-folders.js";

// Create a reverse map for easy lookup
const reverseSpecialFolderPaths = {};
for (const key in SPECIAL_FOLDER_PATHS) {
  reverseSpecialFolderPaths[SPECIAL_FOLDER_PATHS[key]] = key;
}

export function convertInternalPathToWindows(internalPath) {
  // Handle root and other special names directly
  if (internalPath === "/") {
    return "My Computer";
  }
  // This will handle "My Documents", "Desktop" etc.
  const specialFolderKey = reverseSpecialFolderPaths[internalPath];
  if (specialFolderKey) {
    // Legacy: we don't have apps here anymore to avoid circular dependency.
    // In a real app we'd use a separate registry for special folder names.
    return "My Computer";
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
      return "My Computer";
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
  if (windowsPath.toLowerCase() === "my computer") {
    return "/";
  }

  // Check for special folder names like "My Documents"
  // Legacy: disabled to avoid circular dependency

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
