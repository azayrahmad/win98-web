import { SPECIAL_FOLDER_PATHS } from '../config/special-folders.js';
import { apps } from '../config/apps.js';

// Create a reverse map for easy lookup
const reverseSpecialFolderPaths = {};
for (const key in SPECIAL_FOLDER_PATHS) {
  reverseSpecialFolderPaths[SPECIAL_FOLDER_PATHS[key]] = key;
}

export function convertInternalPathToWindows(internalPath) {
  if (internalPath === "/") {
    return "My Computer";
  }

  // Handle special folders via reverse lookup
  const specialFolderKey = reverseSpecialFolderPaths[internalPath];
  if (specialFolderKey) {
    const app = apps.find((app) => app.id === specialFolderKey);
    if (app) return app.title;
  }

  // Handle virtual shell paths (legacy)
  if (internalPath.startsWith("//")) {
    const appId = internalPath.substring(2);
    const app = apps.find((a) => a.id === appId);
    if (app) return app.title;
  }

  // Handle ZenFS paths
  let p = internalPath;
  if (p.startsWith("/")) p = p.substring(1);
  return p.replace(/\//g, "\\");
}

export function convertWindowsPathToInternal(windowsPath) {
  if (!windowsPath) return "/";
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

  // Handle Windows paths -> ZenFS paths
  let p = windowsPath.replace(/\\/g, "/");
  if (!p.startsWith("/")) p = "/" + p;

  // Cleanup common virtual names to their ZenFS equivalents
  if (p.toLowerCase() === "/recycle bin") return "/Recycle Bin";
  if (p.toLowerCase() === "/network neighborhood") return "/Network Neighborhood";
  if (p.toLowerCase() === "/control panel") return "/Control Panel";

  return p;
}
