import { fs } from "@zenfs/core";
import { ICONS, SHORTCUT_OVERLAY } from "../config/icons.js";
import { existsAsync, getZenFSFileUrl } from "./zenfs-utils.js";

const ICON_DIR = "/C:/WINDOWS/Icons";

/**
 * Synchronizes icons from their bundled URLs to ZenFS and updates the icon objects
 * to use Blob URLs from the ZenFS files.
 * @param {Function} onProgress Optional callback for progress logging
 */
export async function syncIconsToZenFS(onProgress) {
  try {
    // Ensure icon directory exists
    if (!(await existsAsync(ICON_DIR))) {
      await fs.promises.mkdir(ICON_DIR, { recursive: true });
    }

    const iconItems = [...Object.values(ICONS), SHORTCUT_OVERLAY];
    let totalIcons = 0;
    let processedEntries = 0;
    const blobUrlCache = new Map();

    // Count icons for progress reporting
    for (const item of iconItems) {
      if (item.path16) totalIcons++;
      if (item.path32) totalIcons++;
    }

    for (const item of iconItems) {
      // Handle 16px version
      if (item.path16) {
        if (onProgress) onProgress(`Syncing icons (${processedEntries}/${totalIcons})...`);

        if (!blobUrlCache.has(item.path16)) {
          await syncIcon(item[16], item.path16);
          blobUrlCache.set(item.path16, await getZenFSFileUrl(item.path16));
        }
        item[16] = blobUrlCache.get(item.path16);
        processedEntries++;
      }

      // Handle 32px version
      if (item.path32) {
        if (onProgress) onProgress(`Syncing icons (${processedEntries}/${totalIcons})...`);

        if (!blobUrlCache.has(item.path32)) {
          await syncIcon(item[32], item.path32);
          blobUrlCache.set(item.path32, await getZenFSFileUrl(item.path32));
        }
        item[32] = blobUrlCache.get(item.path32);
        processedEntries++;
      }
    }

    if (onProgress) onProgress(`Syncing icons completed.`);
  } catch (error) {
    console.error("Failed to sync icons to ZenFS:", error);
  }
}

/**
 * Syncs a single icon file from URL to ZenFS if it doesn't exist.
 * @param {string} url Bundled asset URL
 * @param {string} path ZenFS destination path
 */
async function syncIcon(url, path) {
  if (await existsAsync(path)) {
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(path, new Uint8Array(buffer));
  } catch (error) {
    console.error(`Failed to sync icon ${url} to ${path}:`, error);
  }
}
