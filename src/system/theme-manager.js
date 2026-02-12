import {
  getItem,
  setItem,
  removeItem,
  LOCAL_STORAGE_KEYS,
} from './local-storage.js';
import { themes } from '../config/themes.js';
import { colorSchemes } from '../config/color-schemes.js';
import { applyCursorTheme } from './cursor-manager.js';
import {
  requestBusyState,
  releaseBusyState,
} from './busy-state-manager.js';
import { preloadThemeAssets } from './asset-preloader.js';
import screensaverManager from './screensaver-utils.js';
import { fs } from "@zenfs/core";
import { isZenFSPath, getZenFSFileUrl, existsAsync } from './zenfs-utils.js';

let parserPromise = null;
let activeTheme = null; // In-memory cache to avoid repeated localStorage access
let currentCustomTheme = null;
let resolvedIconScheme = null;
let resolvedSoundScheme = null;
let resolvedCursorScheme = null;
const blobUrls = new Set();

function revokeBlobUrls() {
  for (const url of blobUrls) {
    URL.revokeObjectURL(url);
  }
  blobUrls.clear();
}

async function getThemeAssetUrl(path) {
  const url = await getZenFSFileUrl(path);
  blobUrls.add(url);
  return url;
}

async function resolvePaths(obj) {
  if (!obj || typeof obj !== "object") {
    if (typeof obj === "string" && isZenFSPath(obj)) {
      try {
        return await getThemeAssetUrl(obj);
      } catch (e) {
        console.warn(`Failed to resolve ZenFS path: ${obj}`, e);
        return null;
      }
    }
    return obj;
  }

  const resolved = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && isZenFSPath(value)) {
      try {
        resolved[key] = await getThemeAssetUrl(value);
      } catch (e) {
        console.warn(`Failed to resolve ZenFS path: ${value}`, e);
        // Leave it out so fallback triggers
      }
    } else if (typeof value === "object" && value !== null) {
      resolved[key] = await resolvePaths(value);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export async function loadCustomTheme() {
  const path = "/C:/WINDOWS/CurrentTheme.json";
  if (await existsAsync(path)) {
    try {
      const content = await fs.promises.readFile(path, "utf8");
      currentCustomTheme = JSON.parse(content);
    } catch (e) {
      console.error("Failed to load custom theme from ZenFS", e);
    }
  }
}

export function loadThemeParser() {
  if (!parserPromise) {
    parserPromise = new Promise((resolve, reject) => {
      if (window.makeThemeCSSFile) {
        return resolve();
      }
      const script = document.createElement("script");
      script.src = "./os-gui/parse-theme.js";
      script.onload = resolve;
      script.onerror = () => {
        parserPromise = null; // Reset on error
        reject(new Error("Failed to load theme parser."));
      };
      document.head.appendChild(script);
    });
  }
  return parserPromise;
}

export function getCustomThemes() {
  return getItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES) || {};
}

export function saveCustomTheme(themeId, themeData) {
  const customThemes = getCustomThemes();
  customThemes[themeId] = themeData;
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export function deleteCustomTheme(themeId) {
  const customThemes = getCustomThemes();
  delete customThemes[themeId];
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export function getThemes() {
  const customThemes = getCustomThemes();
  const allThemes = { ...themes, ...customThemes };
  if (currentCustomTheme) {
    allThemes["custom"] = currentCustomTheme;
  }
  return allThemes;
}

export function getColorSchemes() {
  return colorSchemes;
}

// Gets the full theme object from localStorage, with a fallback to default.
// Gets the ID of the base active theme.
export function getActiveThemeId() {
  return getItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME) || "default";
}

// Gets the full theme object for the base active theme.
export function getActiveTheme() {
  const allThemes = getThemes();
  const activeId = getActiveThemeId();
  return allThemes[activeId] || themes.default;
}

// --- Individual Scheme Getters with Overrides ---

export function getColorSchemeId() {
  return getItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || getActiveThemeId();
}

export function getSoundSchemeName() {
  return (
    resolvedSoundScheme ||
    getItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME) ||
    getActiveTheme().soundScheme
  );
}

export function getIconSchemeName() {
  return (
    resolvedIconScheme ||
    getItem(LOCAL_STORAGE_KEYS.ICON_SCHEME) ||
    getActiveTheme().iconScheme
  );
}

export function getCursorSchemeId() {
  return (
    resolvedCursorScheme ||
    getItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME) ||
    getActiveThemeId()
  );
}

// Deprecated: for components that still use it. Should be phased out.
export function getCurrentTheme() {
  return getActiveThemeId();
}

function applyStylesheet(themeId, cssContent) {
  const styleId = `${themeId}-theme-styles`;
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssContent;
}

function removeStylesheet(themeId) {
  const styleId = `${themeId}-theme-styles`;
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}

export async function applyTheme() {
  const allThemes = getThemes();
  const allColorSchemes = getColorSchemes();
  const colorSchemeId = getColorSchemeId();
  const colorScheme = allColorSchemes[colorSchemeId];
  const customThemeForColors = allThemes[colorSchemeId];

  const rawIconScheme =
    getItem(LOCAL_STORAGE_KEYS.ICON_SCHEME) || getActiveTheme().iconScheme;
  const rawSoundScheme =
    getItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME) || getActiveTheme().soundScheme;
  const rawCursorScheme =
    getItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME) || getActiveThemeId();

  // --- Cleanup Phase ---
  // Remove all previously injected style tags
  Object.keys(allColorSchemes).forEach(removeStylesheet);
  const customThemes = getCustomThemes();
  Object.keys(customThemes).forEach(removeStylesheet);
  removeStylesheet("custom"); // For temporary themes

  // Revoke old blob URLs to prevent memory leaks
  revokeBlobUrls();

  // --- Resolution Phase ---
  resolvedIconScheme =
    typeof rawIconScheme === "object" || isZenFSPath(rawIconScheme)
      ? await resolvePaths(rawIconScheme)
      : null;
  resolvedSoundScheme =
    typeof rawSoundScheme === "object" || isZenFSPath(rawSoundScheme)
      ? await resolvePaths(rawSoundScheme)
      : null;
  resolvedCursorScheme =
    typeof rawCursorScheme === "object" || isZenFSPath(rawCursorScheme)
      ? await resolvePaths(rawCursorScheme)
      : null;

  const finalCursorScheme = resolvedCursorScheme || rawCursorScheme;

  // --- Application Phase ---
  applyCursorTheme(finalCursorScheme);

  // Handle built-in color schemes
  if (colorScheme && colorScheme.loader) {
    try {
      const cssModule = await colorScheme.loader();
      applyStylesheet(colorSchemeId, cssModule.default);
    } catch (error) {
      console.error(`Failed to load color scheme "${colorSchemeId}":`, error);
      // Fallback to default if loading fails
      const defaultScheme = allColorSchemes["default"];
      if (defaultScheme && defaultScheme.loader) {
        const cssModule = await defaultScheme.loader();
        applyStylesheet("default", cssModule.default);
      }
    }
  } else if (customThemeForColors && customThemeForColors.colors) {
    // It's a custom or temporary theme, so generate and apply its CSS.
    await loadThemeParser();
    if (window.makeThemeCSSFile) {
      const cssContent = window.makeThemeCSSFile(customThemeForColors.colors);
      const styleId = customThemeForColors.id === "custom" ? "custom" : customThemeForColors.id;
      applyStylesheet(styleId, cssContent);
    }
  } else {
    // Fallback for default or if nothing is found
    const defaultScheme = allColorSchemes["default"];
    if (defaultScheme && defaultScheme.loader) {
      try {
        const cssModule = await defaultScheme.loader();
        applyStylesheet("default", cssModule.default);
      } catch (error) {
        console.error("Failed to load default color scheme:", error);
      }
    }
  }
}

export async function setColorScheme(schemeId) {
  const setColorSchemeId = `set-color-scheme-${Date.now()}`;
  requestBusyState(setColorSchemeId, document.body);
  try {
    const allSchemes = getColorSchemes();
    const allThemes = getThemes(); // For custom themes
    if (!allSchemes[schemeId] && !allThemes[schemeId]?.colors) {
      console.error(`Color scheme with key "${schemeId}" not found.`);
      releaseBusyState(setColorSchemeId, document.body);
      return;
    }
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, schemeId);
    await applyTheme();
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(setColorSchemeId, document.body);
  }
}

export async function setCursorScheme(schemeId) {
  setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, schemeId);
  await applyTheme();
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export function setSoundScheme(schemeName) {
  setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, schemeName);
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export async function applyCustomColorScheme(colorObject) {
  if (!colorObject) {
    console.error("applyCustomColorScheme received an invalid color object.");
    return;
  }

  const applyCustomId = `apply-custom-color-scheme-${Date.now()}`;
  requestBusyState(applyCustomId, document.body);
  try {
    await loadThemeParser();
    if (window.makeThemeCSSFile) {
      const cssContent = window.makeThemeCSSFile(colorObject);
      applyStylesheet("custom", cssContent);
    }
    // Set a temporary key in localStorage so other parts of the system
    // know that a custom, non-saved theme is active.
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, "custom");
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(applyCustomId, document.body);
  }
}

export async function setTheme(themeKey, themeData = null) {
  const setThemeId = `set-theme-${Date.now()}`;
  requestBusyState(setThemeId, document.body);
  try {
    const allThemes = getThemes();
    const newTheme = themeData || allThemes[themeKey];

    if (!newTheme) {
      console.error(`Theme with key "${themeKey}" not found.`);
      return;
    }

    // Set the master theme key
    setItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME, themeKey);

    // Set individual components, clearing any previous overrides
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, themeKey);
    setItem(
      LOCAL_STORAGE_KEYS.SOUND_SCHEME,
      newTheme.sounds || newTheme.soundScheme,
    );
    setItem(
      LOCAL_STORAGE_KEYS.ICON_SCHEME,
      newTheme.icons || newTheme.iconScheme,
    );
    setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, newTheme.cursors || themeKey);

    if (themeKey === "custom" && newTheme) {
      currentCustomTheme = newTheme;
      try {
        await fs.promises.writeFile(
          "/C:/WINDOWS/CurrentTheme.json",
          JSON.stringify(newTheme),
        );
      } catch (e) {
        console.error("Failed to save current custom theme to ZenFS", e);
      }
    } else {
      // Clear persistent custom theme when switching to a predefined theme
      try {
        if (await existsAsync("/C:/WINDOWS/CurrentTheme.json")) {
          await fs.promises.unlink("/C:/WINDOWS/CurrentTheme.json");
        }
        currentCustomTheme = null;
      } catch (e) {}
    }

    if (newTheme.wallpaper) {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER, newTheme.wallpaper);
      if (newTheme.wallpaperMode) {
        setItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, newTheme.wallpaperMode);
      }
    } else {
      removeItem(LOCAL_STORAGE_KEYS.WALLPAPER);
    }

    if (newTheme.screensaver) {
      screensaverManager.setCurrentScreensaver(newTheme.screensaver);
    }

    await preloadThemeAssets(themeKey);
    await applyTheme();

    // Notify components to update
    document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(setThemeId, document.body);
  }
}
