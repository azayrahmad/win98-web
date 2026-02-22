import { themes } from '../config/themes.js';
import { soundSchemes } from '../config/sound-schemes.js';
import { cursors } from '../config/cursors.js';

/**
 * AssetService handles preloading of images, audio, and cursors.
 */
export class AssetService {
  constructor() {
    this.audioPreloadMap = new Map();
  }

  async preloadImage(src) {
    const img = new Image();
    img.src = src;
    if ('decode' in img) {
      return img.decode().catch((err) => {
        console.warn(`Failed to decode image: ${src}`, err);
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

  async preloadAudio(src) {
    if (this.audioPreloadMap.has(src)) return this.audioPreloadMap.get(src);

    const preloadPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(src, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await response.arrayBuffer();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Preload timed out for audio: ${src}`);
        }
        throw error;
      }
    })();

    this.audioPreloadMap.set(src, preloadPromise);
    return preloadPromise;
  }

  async preloadCursor(src) {
    return fetch(src);
  }

  async preloadThemeAssets(themeId, onAssetStart, onAssetFinish) {
    const theme = themes[themeId];
    if (!theme) {
      console.warn(`Theme not found: ${themeId}`);
      return;
    }

    const assetsToLoad = [];
    const queueAsset = (loaderPromiseFactory, src) => {
      let name = src;
      try {
        if (typeof src === 'string') {
          name = src.split('/').pop().split('?')[0];
        }
      } catch (e) {}
      assetsToLoad.push({ factory: loaderPromiseFactory, name });
    };

    if (theme.wallpaper) {
      queueAsset(() => this.preloadImage(theme.wallpaper), theme.wallpaper);
    }

    const soundScheme = soundSchemes[theme.soundScheme];
    if (soundScheme?.sounds) {
      for (const soundItem of Object.values(soundScheme.sounds)) {
        if (soundItem.path) {
          queueAsset(() => this.preloadAudio(soundItem.path), soundItem.path);
        }
      }
    }

    const cursorScheme = cursors[themeId];
    if (cursorScheme?.cursors) {
      for (const cursorItem of Object.values(cursorScheme.cursors)) {
        const path = typeof cursorItem === "string" ? cursorItem : cursorItem.path;
        if (path) {
          queueAsset(() => this.preloadCursor(path), path);
        }
      }
    }

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
}
