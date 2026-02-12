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

    this.customThemeProperties = {
      ...currentColors,
      wallpaper: currentWallpaper,
      iconScheme: currentIconScheme,
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

    const { wallpaper, ...colors } = this.customThemeProperties;
    const customTheme = {
      ...baseTheme,
      id: "custom",
      name: "Current Windows settings",
      colorSchemeId: null,
      colors: colors,
      wallpaper: wallpaper,
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

  async loadFile(path) {
    this.originalFilename = path.split("/").pop().replace(/\.[^/.]+$/, "");
    try {
      const themeContent = await fs.promises.readFile(path, "utf8");
      await loadThemeParser();
      const colors = window.getColorsFromThemeFile(themeContent);
      const wallpaper = window.getWallpaperFromThemeFile(themeContent);
      if (colors) {
        this._showThemeWizard(colors, wallpaper, (updatedTheme) => {
          const cssProperties = window.generateThemePropertiesFromColors(
            updatedTheme.colors,
          );
          this.customThemeProperties = {
            ...cssProperties,
            wallpaper: updatedTheme.wallpaper,
          };
          this.addTemporaryThemeOption();
          this.themeSelector.value = "current-settings";
          this.handleThemeSelection(); // Use the handler to update state
        });
      } else {
        this.themeSelector.value = this.previousThemeId;
        ShowDialogWindow({
          title: "Error",
          text: "Could not parse the selected file.",
          buttons: [{ label: "OK" }],
        });
      }
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
        const { wallpaper, ...colors } = this.customThemeProperties;
        const newTheme = {
          ...themes.default,
          id: newThemeId,
          name: finalName,
          colorSchemeId: null,
          colors: colors,
          wallpaper: wallpaper,
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
          normalizedProperties[key.replace(/^--/, "")] = value;
        }
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

  updatePreviewIcons(schemeId = "default") {
    const scheme = iconSchemes[schemeId] || iconSchemes.default;
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

    this.updatePreviewIcons(theme.iconScheme);

    const variables = await applyThemeToPreview(themeId, this.previewContainer);

    let wallpaperUrl = theme.wallpaper;
    if (wallpaperUrl && isZenFSPath(wallpaperUrl)) {
      wallpaperUrl = await getZenFSFileUrl(wallpaperUrl);
    }

    this.previewContainer.style.backgroundImage = wallpaperUrl
      ? `url('${wallpaperUrl}')`
      : "none";
    this.previewContainer.style.backgroundColor =
      variables["Background"] || "#008080";
  }

  async previewCustomTheme(properties) {
    this.updatePreviewIcons(properties.iconScheme);
    applyPropertiesToPreview(properties, this.previewContainer);

    let wallpaperUrl = properties.wallpaper;
    if (wallpaperUrl && isZenFSPath(wallpaperUrl)) {
      wallpaperUrl = await getZenFSFileUrl(wallpaperUrl);
    }

    this.previewContainer.style.backgroundImage = wallpaperUrl
      ? `url('${wallpaperUrl}')`
      : "none";
    this.previewContainer.style.backgroundColor =
      properties["Background"] || "#008080";
  }

  _rgbToHex(rgbString) {
    const match = rgbString.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (!match) return "#000000";
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  _hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  _showThemeWizard(colors, wallpaper, callback) {
    const wizardWin = new $Window({
      title: "Theme Wizard",
      outerWidth: 350,
      outerHeight: 400,
      resizable: false,
      icons: this.icon,
      className: "theme-wizard-app",
    });

    let currentColors = JSON.parse(JSON.stringify(colors)); // Deep copy
    let currentWallpaper = wallpaper;
    let wallpaperDataUrl = null;

    const showStep1 = () => {
      wizardWin.$content.html(""); // Clear content

      const colorListContainer = document.createElement("div");
      colorListContainer.className = "color-list-container";

      currentColors.forEach((color) => {
        const colorItem = document.createElement("div");
        colorItem.className = "color-item";

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = this._rgbToHex(color.value);
        colorInput.addEventListener("change", (event) => {
          color.value = this._hexToRgb(event.target.value);
        });
        colorItem.appendChild(colorInput);

        const colorLabel = document.createElement("label");
        colorLabel.textContent = color.name;
        colorItem.appendChild(colorLabel);

        colorListContainer.appendChild(colorItem);
      });

      wizardWin.$content.append(colorListContainer);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "wizard-buttons";

      const nextButton = document.createElement("button");
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", showStep2);
      buttonContainer.appendChild(nextButton);

      const cancelButton = document.createElement("button");
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => wizardWin.close());
      buttonContainer.appendChild(cancelButton);

      wizardWin.$content.append(buttonContainer);
    };

    const showStep2 = () => {
      wizardWin.$content.html(""); // Clear content

      const wallpaperContainer = document.createElement("div");
      wallpaperContainer.className = "wallpaper-container";

      const browseButton = document.createElement("button");
      browseButton.textContent = "Browse...";
      wallpaperContainer.appendChild(browseButton);

      const preview = document.createElement("img");
      preview.className = "wallpaper-preview";
      preview.style.display = "none";
      wallpaperContainer.appendChild(preview);

      const updatePreview = async (wpPath) => {
        if (wpPath) {
          let url = wpPath;
          if (isZenFSPath(wpPath)) {
            url = await getZenFSFileUrl(wpPath);
          }
          preview.src = url;
          preview.style.display = "block";
        } else {
          preview.style.display = "none";
        }
      };

      if (currentWallpaper) {
        const initialWallpaperText = document.createElement("p");
        initialWallpaperText.textContent = `Current wallpaper: ${currentWallpaper}`;
        wallpaperContainer.insertBefore(
          initialWallpaperText,
          browseButton.nextSibling,
        );
        updatePreview(currentWallpaper);
      }

      browseButton.addEventListener("click", async () => {
        const path = await ShowFilePicker({
          title: "Browse for Wallpaper",
          mode: "open",
          initialPath: "/C:/WINDOWS",
          fileTypes: [
            {
              label: "Image Files",
              extensions: ["jpg", "jpeg", "png", "gif", "bmp"],
            },
            { label: "All Files", extensions: ["*"] },
          ],
        });

        if (path) {
          currentWallpaper = path;
          wallpaperDataUrl = path;
          updatePreview(path);
        }
      });

      wizardWin.$content.append(wallpaperContainer);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "wizard-buttons";

      const backButton = document.createElement("button");
      backButton.textContent = "Back";
      backButton.addEventListener("click", showStep1);
      buttonContainer.appendChild(backButton);

      const nextButton = document.createElement("button");
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", showStep3);
      buttonContainer.appendChild(nextButton);

      wizardWin.$content.append(buttonContainer);
    };

    const showStep3 = () => {
      wizardWin.$content.html(""); // Clear content

      const confirmationText = document.createElement("p");
      confirmationText.textContent =
        "The theme will be previewed. Click Finish to apply the changes.";
      wizardWin.$content.append(confirmationText);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "wizard-buttons";

      const backButton = document.createElement("button");
      backButton.textContent = "Back";
      backButton.addEventListener("click", showStep2);
      buttonContainer.appendChild(backButton);

      const finishButton = document.createElement("button");
      finishButton.textContent = "Finish";
      finishButton.addEventListener("click", () => {
        callback({ colors: currentColors, wallpaper: wallpaperDataUrl });
        wizardWin.close();
      });
      buttonContainer.appendChild(finishButton);

      wizardWin.$content.append(buttonContainer);
    };

    showStep1();
  }
}
