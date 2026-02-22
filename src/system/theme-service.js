import {
  getItem,
  setItem,
  removeItem,
  LOCAL_STORAGE_KEYS,
} from './local-storage.js';
import { themes } from '../config/themes.js';
import { colorSchemes } from '../config/color-schemes.js';
import { applyCursorTheme } from './cursor-manager.js';
import { preloadThemeAssets } from './asset-preloader.js';
import screensaverManager from './screensaver-utils.js';

/**
 * ThemeService manages OS-wide visual themes, including colors, cursors,
 * wallpapers, and sound schemes.
 */
export class ThemeService {
  constructor(kernel) {
    this.kernel = kernel;
    this.parserPromise = null;
  }

  async loadThemeParser() {
    if (!this.parserPromise) {
      this.parserPromise = new Promise((resolve, reject) => {
        if (window.makeThemeCSSFile) {
          return resolve();
        }
        const script = document.createElement("script");
        script.src = "./os-gui/parse-theme.js";
        script.onload = resolve;
        script.onerror = () => {
          this.parserPromise = null;
          reject(new Error("Failed to load theme parser."));
        };
        document.head.appendChild(script);
      });
    }
    return this.parserPromise;
  }

  getCustomThemes() {
    return getItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES) || {};
  }

  saveCustomTheme(themeId, themeData) {
    const customThemes = this.getCustomThemes();
    customThemes[themeId] = themeData;
    setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
    document.dispatchEvent(new CustomEvent("custom-themes-changed"));
  }

  deleteCustomTheme(themeId) {
    const customThemes = this.getCustomThemes();
    delete customThemes[themeId];
    setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
    document.dispatchEvent(new CustomEvent("custom-themes-changed"));
  }

  getThemes() {
    const customThemes = this.getCustomThemes();
    return { ...themes, ...customThemes };
  }

  getColorSchemes() {
    return colorSchemes;
  }

  getActiveThemeId() {
    return getItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME) || "default";
  }

  getActiveTheme() {
    const allThemes = this.getThemes();
    const activeId = this.getActiveThemeId();
    return allThemes[activeId] || themes.default;
  }

  getColorSchemeId() {
    return getItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || this.getActiveThemeId();
  }

  getSoundSchemeName() {
    return (
      getItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME) || this.getActiveTheme().soundScheme
    );
  }

  getIconSchemeName() {
    return (
      getItem(LOCAL_STORAGE_KEYS.ICON_SCHEME) || this.getActiveTheme().iconScheme
    );
  }

  getCursorSchemeId() {
    return (
      getItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME) || this.getActiveThemeId()
    );
  }

  async applyTheme() {
    const allThemes = this.getThemes();
    const allColorSchemes = this.getColorSchemes();
    const colorSchemeId = this.getColorSchemeId();
    const cursorSchemeId = this.getCursorSchemeId();
    const colorScheme = allColorSchemes[colorSchemeId];
    const customThemeForColors = allThemes[colorSchemeId];

    Object.keys(allColorSchemes).forEach(id => this._removeStylesheet(id));
    const customThemes = this.getCustomThemes();
    Object.keys(customThemes).forEach(id => this._removeStylesheet(id));
    this._removeStylesheet("custom");

    applyCursorTheme(cursorSchemeId);

    if (colorScheme && colorScheme.loader) {
      try {
        const cssModule = await colorScheme.loader();
        this._applyStylesheet(colorSchemeId, cssModule.default);
      } catch (error) {
        console.error(`Failed to load color scheme "${colorSchemeId}":`, error);
        const defaultScheme = allColorSchemes["default"];
        if (defaultScheme && defaultScheme.loader) {
          const cssModule = await defaultScheme.loader();
          this._applyStylesheet("default", cssModule.default);
        }
      }
    } else if (customThemeForColors && customThemeForColors.colors) {
      await this.loadThemeParser();
      if (window.makeThemeCSSFile) {
        const cssContent = window.makeThemeCSSFile(customThemeForColors.colors);
        const styleId = customThemeForColors.id === "custom" ? "custom" : customThemeForColors.id;
        this._applyStylesheet(styleId, cssContent);
      }
    } else {
      const defaultScheme = allColorSchemes["default"];
      if (defaultScheme && defaultScheme.loader) {
        try {
          const cssModule = await defaultScheme.loader();
          this._applyStylesheet("default", cssModule.default);
        } catch (error) {
          console.error("Failed to load default color scheme:", error);
        }
      }
    }
  }

  async setColorScheme(schemeId) {
    const busy = this.kernel.use('busy');
    const busyId = `set-color-scheme-${Date.now()}`;
    busy.requestBusy(busyId);
    try {
      const allSchemes = this.getColorSchemes();
      const allThemes = this.getThemes();
      if (!allSchemes[schemeId] && !allThemes[schemeId]?.colors) {
        console.error(`Color scheme with key "${schemeId}" not found.`);
        return;
      }
      setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, schemeId);
      await this.applyTheme();
      document.dispatchEvent(new CustomEvent("theme-changed"));
    } finally {
      busy.releaseBusy(busyId);
    }
  }

  async setCursorScheme(schemeId) {
    setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, schemeId);
    await this.applyTheme();
    document.dispatchEvent(new CustomEvent("theme-changed"));
  }

  setSoundScheme(schemeName) {
    setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, schemeName);
    document.dispatchEvent(new CustomEvent("theme-changed"));
  }

  async applyCustomColorScheme(colorObject) {
    if (!colorObject) return;

    const busy = this.kernel.use('busy');
    const busyId = `apply-custom-color-scheme-${Date.now()}`;
    busy.requestBusy(busyId);
    try {
      await this.loadThemeParser();
      if (window.makeThemeCSSFile) {
        const cssContent = window.makeThemeCSSFile(colorObject);
        this._applyStylesheet("custom", cssContent);
      }
      setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, "custom");
      document.dispatchEvent(new CustomEvent("theme-changed"));
    } finally {
      busy.releaseBusy(busyId);
    }
  }

  async setTheme(themeKey) {
    const busy = this.kernel.use('busy');
    const busyId = `set-theme-${Date.now()}`;
    busy.requestBusy(busyId);
    try {
      const allThemes = this.getThemes();
      const newTheme = allThemes[themeKey];

      if (!newTheme) {
        console.error(`Theme with key "${themeKey}" not found.`);
        return;
      }

      setItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME, themeKey);
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
      await this.applyTheme();

      document.dispatchEvent(new CustomEvent("wallpaper-changed"));
      document.dispatchEvent(new CustomEvent("theme-changed"));
    } finally {
      busy.releaseBusy(busyId);
    }
  }

  _applyStylesheet(themeId, cssContent) {
    const styleId = `${themeId}-theme-styles`;
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cssContent;
  }

  _removeStylesheet(themeId) {
    const styleId = `${themeId}-theme-styles`;
    const styleEl = document.getElementById(styleId);
    if (styleEl) {
      styleEl.remove();
    }
  }
}
