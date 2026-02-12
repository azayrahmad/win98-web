import { Application } from '../../system/application.js';
import { fs } from "@zenfs/core";
import { ICONS } from '../../config/icons.js';
import { iconSchemes } from '../../config/icon-schemes.js';
import {
  getThemes,
  setTheme,
  saveCustomTheme,
  deleteCustomTheme,
  getCurrentTheme,
  loadThemeParser,
  getColorSchemeId,
  getActiveTheme,
  getIconSchemeName,
  getColorSchemes,
} from '../../system/theme-manager.js';
import {
  fetchThemeCss,
  parseCssVariables,
  applyThemeToPreview,
  applyPropertiesToPreview,
} from '../display-properties/theme-preview.js';
import { getItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import {
  getZenFSFileUrl,
  isZenFSPath,
} from '../../system/zenfs-utils.js';
import {
  requestBusyState,
  releaseBusyState,
} from '../../system/busy-state-manager.js';
import screensaverManager from '../../system/screensaver-utils.js';
import previewHtml from "./DesktopThemesPreview.html?raw";
import "./desktop-themes.css";

const THEME_PATH = "/C:/Program Files/Plus!/Themes";

export class DesktopThemesApp extends Application {
  static config = {
    id: "desktop-themes",
    title: "Desktop Themes",
    description: "Customize your desktop's appearance.",
    icon: ICONS.desktopthemes,
    width: 550,
    height: 500,
    resizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.previousThemeId = null;
    this.customThemeProperties = null;
    this.originalFilename = "";

    this.boundPopulateThemes = this.populateThemes.bind(this);
    document.addEventListener(
      "custom-themes-changed",
      this.boundPopulateThemes,
    );
  }

  async _createWindow() {
    const win = new $Window({
      id: this.id,
      title: this.title,
      outerWidth: 600,
      outerHeight: 500,
      resizable: this.resizable,
      icons: this.icon,
      className: "desktop-themes-app",
    });
    this.win = win;

    win.on("close", () => {
      document.removeEventListener(
        "custom-themes-changed",
        this.boundPopulateThemes,
      );
    });

    const mainContainer = document.createElement("div");
    mainContainer.className = "main-container";
    win.$content.append(mainContainer);

    // --- Left Panel ---
    const leftPanel = document.createElement("div");
    leftPanel.className = "left-panel";
    mainContainer.appendChild(leftPanel);

    const controlsContainer = document.createElement("div");
    controlsContainer.className = "controls";
    leftPanel.appendChild(controlsContainer);

    const themeLabel = document.createElement("label");
    themeLabel.innerHTML = AccessKeys.toHTML("&Theme:");
    controlsContainer.appendChild(themeLabel);

    this.themeSelector = document.createElement("select");
    this.themeSelector.id = "theme-selector";
    themeLabel.setAttribute("for", this.themeSelector.id);
    controlsContainer.appendChild(this.themeSelector);

    this.saveButton = document.createElement("button");
    this.saveButton.textContent = "Save As...";
    this.saveButton.disabled = true;
    controlsContainer.appendChild(this.saveButton);

    this.deleteButton = document.createElement("button");
    this.deleteButton.textContent = "Delete";
    this.deleteButton.disabled = true;
    controlsContainer.appendChild(this.deleteButton);

    this.saveButton.addEventListener("click", () => this.handleSaveTheme());
    this.deleteButton.addEventListener("click", () => this.handleDeleteTheme());
    this.themeSelector.addEventListener("change", () =>
      this.handleThemeSelection(),
    );

    this.previewContainer = document.createElement("div");
    this.previewContainer.className = "preview-container";
    leftPanel.appendChild(this.previewContainer);

    this.previewContainer.innerHTML = previewHtml;

    this.previewLabel = document.createElement("div");
    this.previewLabel.className = "preview-label";

    // --- Right Panel ---
    const rightPanel = document.createElement("div");
    rightPanel.className = "right-panel";
    mainContainer.appendChild(rightPanel);

    // Previews Group
    const previewsFieldset = document.createElement("fieldset");
    previewsFieldset.className = "previews-fieldset";
    previewsFieldset.innerHTML = "<legend>Previews</legend>";
    rightPanel.appendChild(previewsFieldset);

    this.screenSaverButton = document.createElement("button");
    this.screenSaverButton.textContent = "Screen Saver";
    this.screenSaverButton.disabled = true;
    this.screenSaverButton.addEventListener("click", () => {
      const selectedTheme = getThemes()[this.themeSelector.value];
      if (selectedTheme?.screensaver) {
        screensaverManager.showPreview(selectedTheme.screensaver);
      }
    });
    previewsFieldset.appendChild(this.screenSaverButton);

    const pointersButton = document.createElement("button");
    pointersButton.textContent = "Pointers, Sounds, etc...";
    pointersButton.disabled = true;
    previewsFieldset.appendChild(pointersButton);

    // Settings Group
    const settingsFieldset = document.createElement("fieldset");
    settingsFieldset.className = "settings-fieldset";
    settingsFieldset.innerHTML = `
      <legend>Settings</legend>
      <p>Click OK or Apply to apply the selected settings to Windows 98.</p>
      <div class="field-row">
        <input type="checkbox" id="cb-screensaver" checked disabled />
        <label for="cb-screensaver">${AccessKeys.toHTML(
          "Screen &saver",
        )}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-sound" checked disabled />
        <label for="cb-sound">${AccessKeys.toHTML("&Sound events")}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-mouse" checked disabled />
        <label for="cb-mouse">${AccessKeys.toHTML("&Mouse pointers")}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-wallpaper" checked disabled />
        <label for="cb-wallpaper">${AccessKeys.toHTML(
          "Desktop  &wallpaper",
        )}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-icons" checked disabled />
        <label for="cb-icons">${AccessKeys.toHTML("&Icons")}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-colors" checked disabled />
        <label for="cb-colors">${AccessKeys.toHTML("&Colors")}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-fontnames" checked disabled />
        <label for="cb-fontnames">${AccessKeys.toHTML(
          "&Font names and styles",
        )}</label>
      </div>
      <div class="field-row">
        <input type="checkbox" id="cb-fontsizes" checked disabled />
        <label for="cb-fontsizes">${AccessKeys.toHTML(
          "Font and window si&zes",
        )}</label>
      </div>
    `;
    rightPanel.appendChild(settingsFieldset);

    const themes = getThemes();
    const colorSchemes = getColorSchemes();
    const activeTheme = getActiveTheme();
    const currentColorSchemeId = getColorSchemeId() || activeTheme.id;
    const currentColorScheme = colorSchemes[currentColorSchemeId];
    const currentColorSchemeTheme = themes[currentColorSchemeId] || activeTheme;
    const currentWallpaper =
      getItem(LOCAL_STORAGE_KEYS.WALLPAPER) || activeTheme.wallpaper;
    const currentWallpaperMode =
      getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) ||
      activeTheme.wallpaperMode ||
      "center";

    let currentColors = {};
    if (currentColorSchemeTheme.isCustom && currentColorSchemeTheme.colors) {
      for (const [key, value] of Object.entries(
        currentColorSchemeTheme.colors,
      )) {
        currentColors[`--${key.replace(/^--/, "")}`] = value;
      }
    } else if (currentColorScheme) {
      const cssText = await fetchThemeCss(currentColorSchemeId);
      if (cssText) {
        const parsedVariables = parseCssVariables(cssText);
        for (const [key, value] of Object.entries(parsedVariables)) {
          currentColors[`--${key}`] = value;
        }
      }
    }

    const currentIconScheme = getIconSchemeName();
    const currentSoundScheme = getSoundSchemeName();
    const currentCursorScheme = getCursorSchemeId();

    this.customThemeProperties = {
      ...currentColors,
      wallpaper: currentWallpaper,
      wallpaperMode: currentWallpaperMode,
      iconScheme:
        typeof currentIconScheme === "string" ? currentIconScheme : null,
      icons: typeof currentIconScheme === "object" ? currentIconScheme : null,
      soundScheme:
        typeof currentSoundScheme === "string" ? currentSoundScheme : null,
      sounds: typeof currentSoundScheme === "object" ? currentSoundScheme : null,
      cursorScheme:
        typeof currentCursorScheme === "string" ? currentCursorScheme : null,
      cursors:
        typeof currentCursorScheme === "object" ? currentCursorScheme : null,
    };

    await this.populateThemes();

    // --- Bottom Action Buttons ---
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "actions";
    win.$content.append(actionsContainer);

    actionsContainer.appendChild(this.previewLabel);

    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.classList.add("default");
    actionsContainer.appendChild(okButton);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    actionsContainer.appendChild(cancelButton);

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    actionsContainer.appendChild(applyButton);

    const applyCurrentTheme = () => {
      if (this.themeSelector.value === "current-settings") {
        this.applyCustomTheme();
      } else {
        setTheme(this.themeSelector.value);
      }
    };

    applyButton.addEventListener("click", applyCurrentTheme);
    okButton.addEventListener("click", () => {
      applyCurrentTheme();
      win.close();
    });
    cancelButton.addEventListener("click", () => win.close());

    return win;
  }

  async _onLaunch(data) {
    if (typeof data === "string") {
      await this.loadFile(data);
    }
  }

  _createMenuBar(win) {
    return new MenuBar({
      "&File": [{ label: "E&xit", action: () => win.close() }],
    });
  }

  async applyCustomTheme() {
    const themes = getThemes();
    const baseTheme = themes["default"];
    await loadThemeParser();
    const cssContent = window.makeThemeCSSFile(this.customThemeProperties);

    const existingStyle = document.getElementById("custom-theme-styles");
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "custom-theme-styles";
    style.textContent = cssContent;
    document.head.appendChild(style);

    const {
      wallpaper,
      wallpaperMode,
      icons,
      cursors,
      sounds,
      ...colors
    } = this.customThemeProperties;
    const customTheme = {
      ...baseTheme,
      id: "custom",
      name: "Current Windows settings",
      colorSchemeId: null,
      colors: colors,
      wallpaper: wallpaper,
      wallpaperMode: wallpaperMode,
      icons: icons,
      cursors: cursors,
      sounds: sounds,
    };

    setTheme("custom", customTheme);
  }

  async handleCustomThemeLoad() {
    this.previousThemeId = this.themeSelector.value;

    const path = await ShowFilePicker({
      title: "Open Theme",
      mode: "open",
      initialPath: THEME_PATH,
      fileTypes: [
        { label: "Desktop Themes (*.theme)", extensions: ["theme"] },
      ],
    });

    if (!path) {
      this.themeSelector.value = this.previousThemeId;
      return;
    }
    this.loadFile(path);
  }

  async _extractIcons(icoPath) {
    if (!icoPath || !icoPath.toLowerCase().endsWith(".ico")) return null;
    if (typeof ICO === "undefined") {
      console.warn("ICO library not loaded");
      return { 16: icoPath, 32: icoPath };
    }
    try {
      const buffer = await fs.promises.readFile(icoPath);
      const parseFunc = ICO.parseICO || ICO.parse;
      if (typeof parseFunc !== "function") {
        throw new Error("ICO parsing function not found.");
      }
      const images = await parseFunc(buffer.buffer);
      const getIcon = (size) => {
        let img = images.find((i) => i.width === size) || images[0];
        if (img) {
          const blob = new Blob([img.buffer], { type: "image/png" });
          return URL.createObjectURL(blob);
        }
        return null;
      };
      return {
        16: getIcon(16),
        32: getIcon(32),
      };
    } catch (e) {
      console.error("Failed to extract icon", e);
    }
    return null;
  }

  async loadFile(path) {
    const themeDir = path.substring(0, path.lastIndexOf("/"));
    this.originalFilename = path.split("/").pop().replace(/\.[^/.]+$/, "");
    try {
      const themeContent = await fs.promises.readFile(path, "utf8");
      await loadThemeParser();

      const colors = window.getColorsFromThemeFile(themeContent);
      if (!colors) {
        throw new Error("Could not parse colors from theme file.");
      }

      const desktopConfig = window.getDesktopConfigFromThemeFile(
        themeContent,
        themeDir,
      );
      const icons = window.getIconsFromThemeFile(themeContent, themeDir);
      const cursors = window.getCursorsFromThemeFile(themeContent, themeDir);
      const sounds = window.getSoundsFromThemeFile(themeContent, themeDir);

      const cssProperties = window.generateThemePropertiesFromColors(colors);

      this.customThemeProperties = {
        ...cssProperties,
        wallpaper: desktopConfig?.wallpaper || "",
        wallpaperMode:
          desktopConfig?.tileWallpaper === "1"
            ? "tile"
            : desktopConfig?.wallpaperStyle === "2"
              ? "stretch"
              : "center",
        icons,
        cursors,
        sounds,
      };

      this.addTemporaryThemeOption();
      this.themeSelector.value = "current-settings";
      await this.handleThemeSelection(); // Use the handler to update state
    } catch (error) {
      this.themeSelector.value = this.previousThemeId;
      ShowDialogWindow({
        title: "Error",
        text: `An error occurred: ${error.message}`,
        buttons: [{ label: "OK" }],
      });
    }
  }

  async handleSaveTheme() {
    const path = await ShowFilePicker({
      title: "Save Theme",
      mode: "save",
      initialPath: THEME_PATH,
      suggestedName: this.originalFilename
        ? `${this.originalFilename}.theme`
        : "Untitled.theme",
      fileTypes: [
        { label: "Desktop Themes (*.theme)", extensions: ["theme"] },
      ],
    });

    if (path) {
      const content = this._generateThemeFileContent();
      try {
        await fs.promises.writeFile(path, content);
        this.originalFilename = path.split("/").pop().replace(/\.[^/.]+$/, "");

        // Also save to custom themes in localStorage for easy access in the list
        const themes = getThemes();
        const finalName = this.originalFilename;
        const newThemeId = `custom-${finalName
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        const {
          wallpaper,
          wallpaperMode,
          icons,
          cursors,
          sounds,
          ...colors
        } = this.customThemeProperties;
        const newTheme = {
          ...themes.default,
          id: newThemeId,
          name: finalName,
          colorSchemeId: null,
          colors: colors,
          wallpaper: wallpaper,
          wallpaperMode: wallpaperMode,
          icons: icons,
          cursors: cursors,
          sounds: sounds,
          isCustom: true,
        };
        saveCustomTheme(newThemeId, newTheme);
        this.themeSelector.value = newThemeId;
      } catch (e) {
        ShowDialogWindow({
          title: "Error",
          text: `Could not save theme: ${e.message}`,
          buttons: [{ label: "OK" }],
        });
      }
    }
  }

  _generateThemeFileContent() {
    let content = "[Control Panel\\Colors]\n";
    for (const [key, value] of Object.entries(this.customThemeProperties)) {
      if (key.startsWith("--")) {
        const name = key.substring(2);
        const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          content += `${name}=${match[1]} ${match[2]} ${match[3]}\n`;
        }
      }
    }
    content += "\n[Control Panel\\Desktop]\n";
    let wallpaper = this.customThemeProperties.wallpaper || "";
    if (wallpaper.startsWith("/")) {
      // Convert /C:/WINDOWS/Clouds.bmp to C:\WINDOWS\Clouds.bmp
      wallpaper = wallpaper.substring(1).replace(/\//g, "\\");
    }
    content += `Wallpaper=${wallpaper}\n`;
    content += `Tilewallpaper=${
      this.customThemeProperties.wallpaperMode === "tile" ? "1" : "0"
    }\n`;
    content += `WallpaperStyle=${
      this.customThemeProperties.wallpaperMode === "stretch" ? "2" : "0"
    }\n`;
    content += `Pattern=(None)\n`;

    if (this.customThemeProperties.icons) {
      const {
        myComputer,
        networkNeighborhood,
        recycleBinFull,
        recycleBinEmpty,
      } = this.customThemeProperties.icons;

      const formatIcon = (path) =>
        path
          ? path.substring(path.startsWith("/") ? 1 : 0).replace(/\//g, "\\")
          : "";

      content += `\n[CLSID\\{20D04FE0-3AEA-1069-A2D8-08002B30309D}\\DefaultIcon]\nDefaultValue=${formatIcon(
        myComputer,
      )}\n`;
      content += `\n[CLSID\\{208D2C60-3AEA-1069-A2D7-08002B30309D}\\DefaultIcon]\nDefaultValue=${formatIcon(
        networkNeighborhood,
      )}\n`;
      content += `\n[CLSID\\{645FF040-5081-101B-9F08-00AA002F954E}\\DefaultIcon]\nfull=${formatIcon(
        recycleBinFull,
      )}\nempty=${formatIcon(recycleBinEmpty)}\n`;
    }

    if (this.customThemeProperties.cursors) {
      content += "\n[Control Panel\\Cursors]\n";
      const mapping = {
        Arrow: "arrow",
        Help: "help",
        AppStarting: "wait",
        Wait: "busy",
        NWPen: "pen",
        No: "no",
        SizeNS: "sizeNS",
        SizeWE: "sizeWE",
        SizeNWSE: "sizeNWSE",
        SizeNESW: "sizeNESW",
        SizeAll: "move",
        UpArrow: "up",
        IBeam: "beam",
        Crosshair: "cross",
      };
      for (const [winKey, appKey] of Object.entries(mapping)) {
        const path = this.customThemeProperties.cursors[appKey];
        if (path) {
          content += `${winKey}=${path
            .substring(path.startsWith("/") ? 1 : 0)
            .replace(/\//g, "\\")}\n`;
        }
      }
    }

    if (this.customThemeProperties.sounds) {
      const sounds = this.customThemeProperties.sounds;
      const events = [
        "SystemAsterisk",
        "SystemExclamation",
        "SystemHand",
        "SystemQuestion",
        "SystemExit",
        "WindowsLogon",
        "AppGPFault",
        "Maximize",
        "Minimize",
        "RestoreDown",
        "RestoreUp",
        "MenuCommand",
        "MenuPopup",
      ];
      for (const event of events) {
        if (sounds[event]) {
          const path = sounds[event]
            .substring(sounds[event].startsWith("/") ? 1 : 0)
            .replace(/\//g, "\\");
          content += `\n[AppEvents\\Schemes\\Apps\\.Default\\${event}\\.Current]\nDefaultValue=${path}\n`;
        }
      }
      if (sounds.EmptyRecycleBin) {
        const path = sounds.EmptyRecycleBin.substring(
          sounds.EmptyRecycleBin.startsWith("/") ? 1 : 0,
        ).replace(/\//g, "\\");
        content += `\n[AppEvents\\Schemes\\Apps\\Explorer\\EmptyRecycleBin\\.Current]\nDefaultValue=${path}\n`;
      }
    }

    return content;
  }

  handleDeleteTheme() {
    const selectedThemeId = this.themeSelector.value;
    const selectedTheme = getThemes()[selectedThemeId];

    if (selectedTheme?.isCustom) {
      ShowDialogWindow({
        title: "Delete Scheme",
        text: `Are you sure you want to delete "${selectedTheme.name}"?`,
        buttons: [
          {
            label: "Yes",
            action: () => {
              deleteCustomTheme(selectedThemeId);
              this.themeSelector.value = "default";
            },
          },
          { label: "No" },
        ],
      });
    }
  }

  async handleThemeSelection() {
    const selectionId = `theme-selection-${Date.now()}`;
    requestBusyState(selectionId, this.win.$content[0]);
    try {
      const selectedValue = this.themeSelector.value;
      const selectedTheme = getThemes()[selectedValue];

      if (selectedValue === "load-custom") {
        this.handleCustomThemeLoad();
        return;
      }

      this.saveButton.disabled = selectedValue !== "current-settings";
      this.deleteButton.disabled = !selectedTheme?.isCustom;
      this.screenSaverButton.disabled = !selectedTheme?.screensaver;

      if (selectedValue === "current-settings") {
        const normalizedProperties = {};
        for (const [key, value] of Object.entries(this.customThemeProperties)) {
          if (key.startsWith("--")) {
            normalizedProperties[key.replace(/^--/, "")] = value;
          }
        }
        // Also pass other properties
        normalizedProperties.wallpaper = this.customThemeProperties.wallpaper;
        normalizedProperties.wallpaperMode =
          this.customThemeProperties.wallpaperMode;
        normalizedProperties.icons = this.customThemeProperties.icons;
        normalizedProperties.cursors = this.customThemeProperties.cursors;
        normalizedProperties.sounds = this.customThemeProperties.sounds;

        await this.previewCustomTheme(normalizedProperties);
        this.previewLabel.textContent = `Preview of 'Current Windows settings'`;
      } else if (selectedTheme) {
        await this.previewTheme(selectedValue);
        this.previewLabel.textContent = `Preview of '${selectedTheme.name}'`;
      }
    } finally {
      releaseBusyState(selectionId, this.win.$content[0]);
    }
  }

  addTemporaryThemeOption() {
    if (!this.themeSelector.querySelector('option[value="current-settings"]')) {
      const option = document.createElement("option");
      option.value = "current-settings";
      option.textContent = "Current Windows settings";
      this.themeSelector.prepend(option);
    }
  }

  removeTemporaryThemeOption() {
    const option = this.themeSelector.querySelector(
      'option[value="current-settings"]',
    );
    if (option) {
      option.remove();
    }
  }

  async populateThemes() {
    const lastSelected = this.themeSelector.value;
    const isFirstLoad = this.themeSelector.innerHTML === "";
    this.themeSelector.innerHTML = "";

    this.addTemporaryThemeOption();

    const themes = getThemes();
    const sortedThemes = Object.entries(themes).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name),
    );

    for (const [id, theme] of sortedThemes) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = theme.name;
      this.themeSelector.appendChild(option);
    }

    const separator = document.createElement("option");
    separator.disabled = true;
    separator.textContent = "──────────";
    this.themeSelector.appendChild(separator);

    const loadOption = document.createElement("option");
    loadOption.value = "load-custom";
    loadOption.textContent = "<Load Theme>";
    this.themeSelector.appendChild(loadOption);

    if (isFirstLoad) {
      this.themeSelector.value = "current-settings";
    } else if (
      this.themeSelector.querySelector(`option[value="${lastSelected}"]`)
    ) {
      this.themeSelector.value = lastSelected;
    } else {
      this.themeSelector.value = getCurrentTheme();
    }
    await this.handleThemeSelection();
  }

  async updatePreviewIcons(iconSchemeOrData) {
    let scheme;
    if (typeof iconSchemeOrData === "string") {
      scheme = iconSchemes[iconSchemeOrData] || iconSchemes.default;
    } else if (iconSchemeOrData) {
      // Custom icon data
      scheme = {};
      for (const [key, path] of Object.entries(iconSchemeOrData)) {
        if (path && path.toLowerCase().endsWith(".ico")) {
          const extracted = await this._extractIcons(path);
          if (extracted) {
            scheme[key] = extracted;
            continue;
          }
        }
        scheme[key] = { 16: path, 32: path };
      }
    } else {
      scheme = iconSchemes.default;
    }
    const defaultScheme = iconSchemes.default;

    const getIconPath = (iconName) =>
      scheme[iconName]?.[32] || defaultScheme[iconName]?.[32];

    const computerIcon = this.previewContainer.querySelector(
      '[data-icon="my-computer"] img',
    );
    const networkIcon = this.previewContainer.querySelector(
      '[data-icon="network"] img',
    );
    const recycleBinIcon = this.previewContainer.querySelector(
      '[data-icon="recycle-bin"] img',
    );

    if (computerIcon) computerIcon.src = getIconPath("myComputer");
    if (networkIcon) networkIcon.src = getIconPath("networkNeighborhood");
    if (recycleBinIcon) recycleBinIcon.src = getIconPath("recycleBinEmpty");
  }

  async previewTheme(themeId) {
    const theme = getThemes()[themeId];
    if (!theme) return;

    await this.updatePreviewIcons(theme.iconScheme);

    const variables = await applyThemeToPreview(themeId, this.previewContainer);

    let wallpaperUrl = theme.wallpaper;
    if (wallpaperUrl && isZenFSPath(wallpaperUrl)) {
      wallpaperUrl = await getZenFSFileUrl(wallpaperUrl);
    }

    this.previewContainer.style.backgroundImage = wallpaperUrl
      ? `url('${wallpaperUrl}')`
      : "none";

    // Set default background properties for predefined themes
    this.previewContainer.style.backgroundRepeat = "no-repeat";
    this.previewContainer.style.backgroundPosition = "center";
    this.previewContainer.style.backgroundSize = "cover";

    this.previewContainer.style.backgroundColor =
      variables["Background"] || "#008080";
  }

  async previewCustomTheme(properties) {
    await this.updatePreviewIcons(properties.icons || properties.iconScheme);
    applyPropertiesToPreview(properties, this.previewContainer);

    let wallpaperUrl = properties.wallpaper;
    if (wallpaperUrl && isZenFSPath(wallpaperUrl)) {
      wallpaperUrl = await getZenFSFileUrl(wallpaperUrl);
    }

    this.previewContainer.style.backgroundImage = wallpaperUrl
      ? `url('${wallpaperUrl}')`
      : "none";

    if (properties.wallpaperMode === "tile") {
      this.previewContainer.style.backgroundRepeat = "repeat";
      this.previewContainer.style.backgroundPosition = "0 0";
      this.previewContainer.style.backgroundSize = "auto";
    } else if (properties.wallpaperMode === "stretch") {
      this.previewContainer.style.backgroundRepeat = "no-repeat";
      this.previewContainer.style.backgroundPosition = "center";
      this.previewContainer.style.backgroundSize = "100% 100%";
    } else {
      // center
      this.previewContainer.style.backgroundRepeat = "no-repeat";
      this.previewContainer.style.backgroundPosition = "center";
      this.previewContainer.style.backgroundSize = "auto";
    }

    this.previewContainer.style.backgroundColor =
      properties["Background"] || "#008080";
  }
}
