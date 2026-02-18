import { getItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import { apps } from '../../config/apps.js';

export function getItemFromIcon(icon) {
  const fileId = icon.getAttribute("data-file-id");
  // const filePath = icon.getAttribute("data-file-path");
  const appId = icon.getAttribute("data-app-id");

  if (fileId) {
    const droppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
    const file = droppedFiles.find((f) => f.id === fileId);
    return { ...file, itemType: "dropped-file", source: "desktop" };
  }

  // getDesktopContents removed, this utility is legacy
  const appItem = apps.find((a) => a.id === appId);
  if (appItem) {
    return { ...appItem, itemType: "app", source: "desktop" };
  }

  return null;
}
