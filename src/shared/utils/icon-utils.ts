import { getItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import { apps } from '../../config/apps.js';

export function getItemFromIcon(icon: HTMLElement): any {
  const fileId = icon.getAttribute("data-file-id");
  const appId = icon.getAttribute("data-app-id");

  if (fileId) {
    const droppedFiles = (getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) as any[]) || [];
    const file = droppedFiles.find((f) => f.id === fileId);
    return { ...file, itemType: "dropped-file", source: "desktop" };
  }

  // getDesktopContents removed, this utility is legacy
  const appItem = apps.find((a: any) => a.id === appId);
  if (appItem) {
    return { ...appItem, itemType: "app", source: "desktop" };
  }

  return null;
}
