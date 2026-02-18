// src/config/generate-plusfiles.js
import { soundSchemes } from './sound-schemes.js';
import { iconSchemes } from './icon-schemes.js';
import { wallpapers } from './wallpapers.js';
import { cursors } from './cursors.js';
import { SCREENSAVERS } from './screensavers.js';
import { ICONS } from './icons.js';

/**
 * Dynamically generates the "Plus!" directory contents by importing theme assets.
 * @returns {Array} An array of objects representing the files.
 */
export function generatePlusFiles() {
  const files = [];
  const processedUrls = new Set(); // To avoid duplicate files

  const addFileFromUrl = (url) => {
    if (!url || typeof url !== "string" || processedUrls.has(url)) {
      return;
    }

    const filename = url.substring(url.lastIndexOf("/") + 1);
    const sanitizedId = url.replace(/[^a-zA-Z0-9]/g, "-");

    files.push({
      id: `file-plus-${sanitizedId}`,
      name: decodeURIComponent(filename),
      type: "file",
      contentUrl: url,
    });
    processedUrls.add(url);
  };

  // Process sound schemes
  for (const scheme of Object.values(soundSchemes)) {
    if (scheme.sounds) {
      for (const soundItem of Object.values(scheme.sounds)) {
        const path = typeof soundItem === "string" ? soundItem : soundItem.path;
        addFileFromUrl(path);
      }
    }
  }

  // Process icon schemes
  for (const scheme of Object.values(iconSchemes)) {
    if (scheme.icons) {
      for (const iconItem of Object.values(scheme.icons)) {
        if (iconItem && typeof iconItem === "object") {
          if (iconItem["16"]) addFileFromUrl(iconItem["16"]);
          if (iconItem["32"]) addFileFromUrl(iconItem["32"]);
        }
      }
    }
  }

  // Process wallpapers
  for (const wallpaper of wallpapers.themes) {
    addFileFromUrl(wallpaper.src);
  }

  // Process cursors
  for (const scheme of Object.values(cursors)) {
    if (scheme.cursors) {
      for (const cursorItem of Object.values(scheme.cursors)) {
        const path = typeof cursorItem === "string" ? cursorItem : cursorItem.path;
        addFileFromUrl(path);
      }
    }
  }

  // Process screensavers
  for (const screensaver of Object.values(SCREENSAVERS)) {
    if (screensaver.path) {
      addFileFromUrl(screensaver.path);
    }
  }

  return files;
}
