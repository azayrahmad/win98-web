import { kernel } from './kernel.js';

/**
 * Legacy AssetPreloader proxying to AssetService in Kernel.
 * @deprecated Use kernel.use('assets') instead.
 */

export async function preloadImage(src) {
  return kernel.use('assets').preloadImage(src);
}

export async function preloadThemeAssets(themeId, onAssetStart, onAssetFinish) {
  return kernel.use('assets').preloadThemeAssets(themeId, onAssetStart, onAssetFinish);
}
