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

let parserPromise: Promise<void> | null = null;

export function loadThemeParser(): Promise<void> {
  if (!parserPromise) {
    parserPromise = new Promise((resolve, reject) => {
      if ((window as any).makeThemeCSSFile) {
        return resolve();
      }
      const script = document.createElement("script");
      script.src = "./os-gui/parse-theme.js";
      script.onload = () => resolve();
      script.onerror = () => {
        parserPromise = null; // Reset on error
        reject(new Error("Failed to load theme parser."));
      };
      document.head.appendChild(script);
    });
  }
  return parserPromise;
}

export function getCustomThemes(): Record<string, any> {
  const customThemes = getItem<Record<string, any>>(LOCAL_STORAGE_KEYS.CUSTOM_THEMES);
  return (typeof customThemes === 'object' && customThemes !== null ? customThemes : {}) as Record<string, any>;
}

export function saveCustomTheme(themeId: string, themeData: any): void {
  const customThemes = getCustomThemes();
  customThemes[themeId] = themeData;
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export function deleteCustomTheme(themeId: string): void {
  const customThemes = getCustomThemes();
  delete customThemes[themeId];
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export function getThemes(): Record<string, any> {
  const customThemes = getCustomThemes();
  return { ...themes, ...customThemes };
}

export function getColorSchemes(): Record<string, any> {
  return colorSchemes;
}

// Gets the ID of the base active theme.
export function getActiveThemeId(): string {
  return (getItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME) as string) || "default";
}

// Gets the full theme object for the base active theme.
export function getActiveTheme(): any {
  const allThemes = getThemes();
  const activeId = getActiveThemeId();
  return allThemes[activeId] || (themes as any).default;
}

// --- Individual Scheme Getters with Overrides ---

export function getColorSchemeId(): string {
  return (getItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME) as string) || getActiveThemeId();
}

export function getSoundSchemeName(): string {
  return (
    (getItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME) as string) || getActiveTheme().soundScheme
  );
}

export function getIconSchemeName(): string {
  return (
    (getItem(LOCAL_STORAGE_KEYS.ICON_SCHEME) as string) || getActiveTheme().iconScheme
  );
}

export function getCursorSchemeId(): string {
  return (
    (getItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME) as string) || getActiveThemeId()
  );
}

// Deprecated: for components that still use it. Should be phased out.
export function getCurrentTheme(): string {
  return getActiveThemeId();
}

function applyStylesheet(themeId: string, cssContent: string): void {
  const styleId = `${themeId}-theme-styles`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssContent;
}

function removeStylesheet(themeId: string): void {
  const styleId = `${themeId}-theme-styles`;
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}

export async function applyTheme(): Promise<void> {
  const allThemes = getThemes();
  const allColorSchemes = getColorSchemes();
  const colorSchemeId = getColorSchemeId();
  const cursorSchemeId = getCursorSchemeId();
  const colorScheme = allColorSchemes[colorSchemeId];
  const customThemeForColors = allThemes[colorSchemeId];

  // --- Cleanup Phase ---
  // Remove all previously injected style tags
  Object.keys(allColorSchemes).forEach(removeStylesheet);
  const customThemes = getCustomThemes();
  Object.keys(customThemes).forEach(removeStylesheet);
  removeStylesheet("custom"); // For temporary themes

  // --- Application Phase ---
  applyCursorTheme(cursorSchemeId);

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
    if ((window as any).makeThemeCSSFile) {
      const cssContent = (window as any).makeThemeCSSFile(customThemeForColors.colors);
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

export async function setColorScheme(schemeId: string): Promise<void> {
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

export async function setCursorScheme(schemeId: string): Promise<void> {
  setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, schemeId);
  await applyTheme();
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export function setSoundScheme(schemeName: string): void {
  setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, schemeName);
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export async function applyCustomColorScheme(colorObject: any): Promise<void> {
  if (!colorObject) {
    console.error("applyCustomColorScheme received an invalid color object.");
    return;
  }

  const applyCustomId = `apply-custom-color-scheme-${Date.now()}`;
  requestBusyState(applyCustomId, document.body);
  try {
    await loadThemeParser();
    if ((window as any).makeThemeCSSFile) {
      const cssContent = (window as any).makeThemeCSSFile(colorObject);
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

export async function setTheme(themeKey: string): Promise<void> {
  const setThemeId = `set-theme-${Date.now()}`;
  requestBusyState(setThemeId, document.body);
  try {
    const allThemes = getThemes();
    const newTheme = allThemes[themeKey];

    if (!newTheme) {
      console.error(`Theme with key "${themeKey}" not found.`);
      return;
    }

    // Set the master theme key
    setItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME, themeKey);

    // Set individual components, clearing any previous overrides
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, themeKey);
    setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, newTheme.soundScheme);
    setItem(LOCAL_STORAGE_KEYS.ICON_SCHEME, newTheme.iconScheme);
    setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, themeKey);

    if (newTheme.wallpaper) {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER, newTheme.wallpaper);
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
