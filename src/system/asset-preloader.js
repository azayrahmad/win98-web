import { themes } from '../config/themes.js';
import { soundSchemes } from '../config/sound-schemes.js';
import { cursors } from '../config/cursors.js';

export async function preloadImage(src) {
  const img = new Image();
  img.src = src;
  if ('decode' in img) {
    return img.decode().catch((err) => {
      console.warn(`Failed to decode image: ${src}`, err);
      // Fallback to standard loading if decode fails
      return new Promise((resolve, reject) => {
        if (img.complete) return resolve();
        img.onload = resolve;
        img.onerror = reject;
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      if (img.complete) return resolve();
      img.onload = resolve;
      img.onerror = reject;
    });
  }
}

const audioPreloadMap = new Map();

async function preloadAudio(src) {
  if (audioPreloadMap.has(src)) return audioPreloadMap.get(src);

  const preloadPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(src, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // Consume the body to ensure it's fully downloaded into the HTTP cache
      await response.arrayBuffer();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Preload timed out for audio: ${src}`);
      }
      throw error;
    }
  })();

  audioPreloadMap.set(src, preloadPromise);
  return preloadPromise;
}

async function preloadCursor(src) {
  // For cursors, we just need to fetch the file to get it into the browser cache
  return fetch(src);
}

export async function preloadThemeAssets(themeId, onAssetStart, onAssetFinish) {
  const theme = themes[themeId];
  if (!theme) {
    console.warn(`Theme not found: ${themeId}`);
    return;
  }

  const assetsToLoad = [];

  const queueAsset = (loaderPromiseFactory, src) => {
    // Extract filename for display
    let name = src;
    try {
      if (typeof src === 'string') {
        name = src.split('/').pop().split('?')[0];
      }
    } catch (e) {
      // fallback
    }
    assetsToLoad.push({ factory: loaderPromiseFactory, name });
  };

  // Wallpaper
  if (theme.wallpaper) {
    // We need to wrap the call in a function to delay execution
    queueAsset(() => preloadImage(theme.wallpaper), theme.wallpaper);
  }

  // Sound scheme
  const soundScheme = soundSchemes[theme.soundScheme];
  if (soundScheme?.sounds) {
    for (const soundItem of Object.values(soundScheme.sounds)) {
      if (soundItem.path) {
        queueAsset(() => preloadAudio(soundItem.path), soundItem.path);
      }
    }
  }

  // Cursor scheme
  const cursorScheme = cursors[themeId];
  if (cursorScheme?.cursors) {
    for (const cursorItem of Object.values(cursorScheme.cursors)) {
      const path = typeof cursorItem === "string" ? cursorItem : cursorItem.path;
      if (path) {
        queueAsset(() => preloadCursor(path), path);
      }
    }
  }

  // Execute sequentially
  for (const asset of assetsToLoad) {
    let logHandle = null;
    if (onAssetStart) {
      logHandle = await onAssetStart(asset.name);
    }

    try {
      await asset.factory();
      if (onAssetFinish) onAssetFinish(logHandle, "OK");
    } catch (e) {
      console.warn('Failed to preload asset:', e);
      if (onAssetFinish) onAssetFinish(logHandle, "FAILED");
    }
  }
}
