import { getItem, LOCAL_STORAGE_KEYS } from "./localStorage.js";
import { getDesktopContents } from "./directory.js";

export async function getItemFromIcon(icon) {
  const fileId = icon.getAttribute("data-file-id");
  const filePath = icon.getAttribute("data-file-path");
  const appId = icon.getAttribute("data-app-id");

  if (fileId) {
    const droppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
    const file = droppedFiles.find((f) => f.id === fileId);
    return { ...file, itemType: "dropped-file", source: "desktop" };
  }

  const desktopContents = getDesktopContents();

  if (filePath) {
    const file = desktopContents.find(
      (item) => item.path === filePath && item.type !== "app",
    );
    if (file) {
      return { ...file, itemType: "virtual-file", source: "desktop" };
    }
  }

  const { apps } = await import("../config/apps.js");
  const appItem = apps.find((a) => a.id === appId);
  const isDesktopApp = desktopContents.some(
    (item) => item.id === appId && item.type === "app",
  );
  if (appItem && isDesktopApp) {
    return { ...appItem, itemType: "app", source: "desktop" };
  }

  return null;
}
