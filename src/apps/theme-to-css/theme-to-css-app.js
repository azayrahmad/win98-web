import { Application } from '../../system/application.js';
import { fs } from "@zenfs/core";
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import { getZenFSFileAsText } from '../../system/zenfs-utils.js';
import { NotepadEditor } from '../../apps/notepad/notepad-editor.js';
import "./themetocss.css";
import { ICONS } from '../../config/icons.js';

export class ThemeToCssApp extends Application {
  static config = {
    id: "theme-to-css",
    title: "Theme to CSS",
    description: "Convert a Windows theme file to CSS.",
    icon: ICONS.themetocss,
    width: 700,
    height: 350,
    resizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow() {
    const win = new $Window({
      id: this.id,
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
      className: "themetocss-app",
    });

    const menuBar = this._createMenuBar(win);
    win.setMenuBar(menuBar);

    const mainContainer = document.createElement("div");
    mainContainer.className = "themetocss-main-container";
    win.$content.append(mainContainer);

    const editorContainer = document.createElement("div");
    editorContainer.className = "themetocss-editor-container";
    mainContainer.appendChild(editorContainer);

    this.editor = new NotepadEditor(editorContainer, { win });
    this.editor.setLanguage("css");
    this.editor.setValue("/* Open a .theme file to see the CSS output */");

    this.swatchContainer = document.createElement("div");
    this.swatchContainer.className = "themetocss-swatch-container";
    mainContainer.appendChild(this.swatchContainer);

    return win;
  }

  _createMenuBar(win) {
    return new MenuBar({
      "&File": [
        {
          label: "&Open",
          action: () => this._openFile(),
        },
        {
          label: "&Save",
          action: () => this._saveFile(),
        },
        {
          label: "E&xit",
          action: () => win.close(),
        },
      ],
      "&Edit": [
        {
          label: "&Apply Theme",
          action: () => this._applyTheme(),
        },
      ],
    });
  }

  _applyTheme() {
    const cssContent = this.editor.getValue();

    // Remove existing transient styles to prevent stacking
    const existingStyle = document.getElementById("transient-theme-styles");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject the new style tag
    const style = document.createElement("style");
    style.id = "transient-theme-styles";
    style.textContent = cssContent;
    document.head.appendChild(style);
  }

  async _openFile() {
    const path = await ShowFilePicker({
      title: "Open Theme File",
      mode: "open",
      fileTypes: [
        {
          label: "Theme Files (*.theme, *.themepack)",
          extensions: ["theme", "themepack"],
        },
      ],
    });

    if (path) {
      try {
        const themeContent = await getZenFSFileAsText(path);
        await this._loadParserScript();
        const cssProperties = window.parseThemeFileString(themeContent);
        if (cssProperties) {
          const cssFileContent = window.makeThemeCSSFile(cssProperties);
          this.editor.setValue(cssFileContent);
          this._renderSwatches(cssProperties);
        } else {
          this.editor.setValue(
            "/* Error: Failed to parse theme file. See console for details. */",
          );
        }
      } catch (error) {
        console.error(error);
        this.editor.setValue(`/* Error: ${error.message} */`);
      }
    }
  }

  async _saveFile() {
    const content = this.editor.getValue();

    const path = await ShowFilePicker({
      title: "Save CSS",
      mode: "save",
      suggestedName: "theme.css",
      fileTypes: [{ label: "CSS Files (*.css)", extensions: ["css"] }],
    });

    if (path) {
      try {
        await fs.promises.writeFile(path, content);
      } catch (err) {
        console.error("Error saving file:", err);
      }
    }
  }

  _loadParserScript() {
    return new Promise((resolve, reject) => {
      if (window.parseThemeFileString && window.makeThemeCSSFile) {
        resolve();
        return;
      }

      if (document.querySelector('script[src="./os-gui/parse-theme.js"]')) {
        const interval = setInterval(() => {
          if (window.parseThemeFileString && window.makeThemeCSSFile) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.src = "./os-gui/parse-theme.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load theme parser script."));
      document.head.appendChild(script);
    });
  }

  _renderSwatches(cssProperties) {
    this.swatchContainer.innerHTML = ""; // Clear previous swatches

    // Apply all theme properties to the container to resolve CSS variables in SVGs
    for (const [key, value] of Object.entries(cssProperties)) {
      this.swatchContainer.style.setProperty(key, value);
    }

    for (const [key, value] of Object.entries(cssProperties)) {
      const swatchItem = document.createElement("div");
      swatchItem.className = "swatch-item";

      const nameLabel = document.createElement("div");
      nameLabel.className = "swatch-name";
      nameLabel.textContent = key;
      swatchItem.appendChild(nameLabel);

      if (value.startsWith("rgb")) {
        const colorBox = document.createElement("div");
        colorBox.className = "swatch-color";
        colorBox.style.backgroundColor = value;
        swatchItem.appendChild(colorBox);
      } else if (value.startsWith("url(")) {
        // only take the first token (before possible "64 / 2px" stuff)
        const match = value.trim().match(/^url\((['"]?)(.*?)\1\)/);
        if (!match) return;

        const img = document.createElement("img");
        img.className = "swatch-image";
        img.src = match[2]; // only the real data URI
        swatchItem.appendChild(img);
      }

      this.swatchContainer.appendChild(swatchItem);
    }
  }
}
