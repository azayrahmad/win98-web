import { themes } from '../config/themes.js';
import { soundSchemes } from '../config/sound-schemes.js';
import { cursors } from '../config/cursors.js';

export async function preloadImage(src: string): Promise<void> {
  const img = new Image();
  img.src = src;
  if ('decode' in img) {
    return (img as any).decode().catch((err: any) => {
      console.warn(`Failed to decode image: ${src}`, err);
      // Fallback to standard loading if decode fails
      return new Promise<void>((resolve, reject) => {
        if (img.complete) return resolve();
        img.onload = () => resolve();
        img.onerror = reject;
      });
    });
  } else {
    return new Promise<void>((resolve, reject) => {
      const anyImg = img as any;
      if (anyImg.complete) return resolve();
      anyImg.onload = () => resolve();
      anyImg.onerror = reject;
    });
  }
}

async function preloadAudio(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = src;
    audio.addEventListener('canplaythrough', () => resolve(), { once: true });
    audio.onerror = reject;
  });
}

async function preloadCursor(src: string): Promise<Response> {
  // For cursors, we just need to fetch the file to get it into the browser cache
  return fetch(src);
}

export async function preloadThemeAssets(
  themeId: string,
  onAssetStart?: (name: string) => Promise<any> | any,
  onAssetFinish?: (handle: any, status: "OK" | "FAILED") => void
): Promise<void> {
  const theme = (themes as any)[themeId];
  if (!theme) {
    console.warn(`Theme not found: ${themeId}`);
    return;
  }

  const assetsToLoad: { factory: () => Promise<any>, name: string }[] = [];

  const queueAsset = (loaderPromiseFactory: () => Promise<any>, src: any) => {
    // Extract filename for display
    let name = String(src);
    try {
      if (typeof src === 'string') {
        name = src.split('/').pop()?.split('?')[0] || src;
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
  const soundScheme = (soundSchemes as any)[theme.soundScheme];
  if (soundScheme) {
    for (const sound in soundScheme) {
      if (soundScheme[sound]) {
        queueAsset(() => preloadAudio(soundScheme[sound]), soundScheme[sound]);
      }
    }
  }

  // Cursor scheme
  const cursorScheme = (cursors as any)[themeId];
  if (cursorScheme) {
    for (const cursor in cursorScheme) {
      if (cursorScheme[cursor]) {
        queueAsset(() => preloadCursor(cursorScheme[cursor]), cursorScheme[cursor]);
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
