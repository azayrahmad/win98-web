import { Application } from '../../system/application.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import { getZenFSFileAsBlob, getZenFSFileAsText } from '../../system/zenfs-utils.js';
import './appmaker.css';
import '../notepad/notepad-editor.css';
import { setupIcons } from '../../shell/desktop/desktop.js';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import { registerCustomApp } from '../../system/custom-app-manager.js';
import { NotepadEditor } from '../../apps/notepad/notepad-editor.js';
import { renderHTML } from '../../shared/utils/dom-utils.js';
import { ICONS } from '../../config/icons.js';

export class AppMakerApp extends Application {
    static config = {
        id: "app-maker",
        title: "App Maker",
        description: "Create your own applications.",
        icon: ICONS.appmaker,
        width: 600,
        height: 500,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.appWidth = 400;
        this.appHeight = 300;
    }

    _createWindow() {
        const win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
        });

        const menuBar = this._createMenuBar();
        win.setMenuBar(menuBar);

        win.$content.append('<div class="appmaker-container"></div>');
        return win;
    }

    _createMenuBar() {
        return new MenuBar({
            "&File": [
                {
                    label: "&Open HTML...",
                    action: () => this._openHtmlFile(),
                },
                "MENU_DIVIDER",
                {
                    label: "&Save",
                    shortcutLabel: "Ctrl+S",
                    action: () => this._saveApp(),
                },
                "MENU_DIVIDER",
                {
                    label: "E&xit",
                    action: () => this.win.close(),
                },
            ],
            "&Edit": [
                {
                    label: "&Options...",
                    action: () => this._showOptions(),
                },
            ],
            "&View": [
                {
                    label: "&Preview",
                    action: () => this._previewApp(),
                },
            ],
            "&Help": [
                {
                    label: "&About App Maker",
                    action: () => alert("A simple app maker."),
                },
            ],
        });
    }

    _showOptions() {
        ShowDialogWindow({
            title: 'Options',
            text: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div class="field-row">
                        <label for="appWidth" style="flex: 1;">Width (px):</label>
                        <input type="number" id="appmaker-width" value="${this.appWidth}" style="width: 60px;">
                    </div>
                    <div class="field-row">
                        <label for="appHeight" style="flex: 1;">Height (px):</label>
                        <input type="number" id="appmaker-height" value="${this.appHeight}" style="width: 60px;">
                    </div>
                </div>
            `,
            buttons: [
                {
                    label: 'OK',
                    action: (win) => {
                        const widthInput = win.$content.find('#appmaker-width')[0];
                        const heightInput = win.$content.find('#appmaker-height')[0];
                        this.appWidth = parseInt(widthInput.value, 10) || 400;
                        this.appHeight = parseInt(heightInput.value, 10) || 300;
                    },
                    isDefault: true,
                },
                {
                    label: 'Cancel',
                },
            ],
        });
    }

    _onLaunch() {
        const container = this.win.$content.find('.appmaker-container')[0];
        container.innerHTML = this._getHTML();

        this.appNameInput = container.querySelector('#appName');
        this.appNameInput.addEventListener('input', () => this._updateTitle());

        const editorContainer = document.createElement('div');
        editorContainer.id = 'editor-container';
        container.appendChild(editorContainer);

        this.editor = new NotepadEditor(editorContainer, {
            win: this.win,
            language: 'html'
        });

        this.appIconPreview = container.querySelector('#appIconPreview');
        this.appIconUrlInput = container.querySelector('#appIconUrl');
        const uploadButton = container.querySelector('#uploadButton');

        this.appIconUrlInput.addEventListener('input', () => {
            const url = this.appIconUrlInput.value.trim();
            if (url) {
                this.appIconPreview.src = url;
                this.appIconPreview.style.display = 'block';
                this.appIcon = url;
                this.appIconFileInput.value = ''; // Clear file input
            } else {
                this.appIconPreview.style.display = 'none';
                this.appIcon = null;
            }
        });

        this.appIconPreview.onerror = () => {
            this.appIconPreview.style.display = 'none';
            this.appIcon = null;
        };

        uploadButton.addEventListener('click', async () => {
          const path = await ShowFilePicker({
            title: "Choose App Icon",
            mode: "open",
            fileTypes: [
              {
                label: "Image Files",
                extensions: ["jpg", "jpeg", "png", "gif", "bmp"],
              },
            ],
          });

          if (path) {
            try {
              const blob = await getZenFSFileAsBlob(path);
              const reader = new FileReader();
              reader.onload = (e) => {
                this.appIconPreview.src = e.target.result;
                this.appIconPreview.style.display = "block";
                this.appIcon = e.target.result; // This is the data URL
                this.appIconUrlInput.value = ""; // Clear URL input
              };
              reader.readAsDataURL(blob);
            } catch (e) {
              console.error("Error loading icon from ZenFS:", e);
            }
          }
        });

        this._updateTitle();
    }

    _updateTitle() {
        const appName = this.appNameInput.value;
        const newTitle = appName ? `${appName} - App Maker` : 'App Maker';
        this.win.title(newTitle);
    }

    async _openHtmlFile() {
      const path = await ShowFilePicker({
        title: "Open HTML File",
        mode: "open",
        fileTypes: [{ label: "HTML Files (*.html)", extensions: ["html"] }],
      });

      if (path) {
        try {
          const htmlContent = await getZenFSFileAsText(path);
          const fileName = path.split("/").pop().replace(/\.html$/, "");
          this.appNameInput.value = fileName;
          this.editor.setValue(htmlContent);
          this._updateTitle();
        } catch (e) {
          console.error("Error loading HTML from ZenFS:", e);
        }
      }
    }

    _previewApp() {
        const appName = this.appNameInput.value || 'Preview';
        const appHtml = this.editor.getValue();

        const previewWindow = new $Window({
            title: appName,
            outerWidth: this.appWidth,
            outerHeight: this.appHeight,
            resizable: true,
        });

        renderHTML(previewWindow.$content[0], appHtml);
    }

    _saveApp() {
        const appName = this.appNameInput.value;
        const appHtml = this.editor.getValue();

        if (!appName) {
            ShowDialogWindow({
                title: 'Error',
                text: 'Please enter an app name.',
                soundEvent: 'SystemHand',
            });
            return;
        }

        ShowDialogWindow({
            title: 'Save App',
            text: `Are you sure you want to save the app "${appName}"?`,
            modal: true,
            buttons: [
                {
                    label: 'Yes',
                    action: () => {
                        const appId = appName.toLowerCase().replace(/\s/g, '');

                        const appInfo = {
                            id: appId,
                            title: appName,
                            html: appHtml,
                            width: this.appWidth,
                            height: this.appHeight,
                            icon: this.appIcon,
                        };

                        registerCustomApp(appInfo);

                        const savedApps = getItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS) || [];
                        const existingAppIndex = savedApps.findIndex(app => app.id === appId);
                        if (existingAppIndex > -1) {
                            savedApps[existingAppIndex] = appInfo;
                        } else {
                            savedApps.push(appInfo);
                        }
                        setItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS, savedApps);

                        const desktop = document.querySelector('.desktop');
                        if (desktop && typeof desktop.refreshIcons === 'function') {
                            desktop.refreshIcons();
                        }
                    },
                    isDefault: true,
                },
                {
                    label: 'No',
                },
            ],
        });
    }

    _getHTML() {
        return `
            <label for="appName">App Name:</label>
            <input type="text" id="appName" class="app-name-input" placeholder="Enter app name">

            <label>App Icon:</label>
            <div class="icon-input-container">
                <img id="appIconPreview" src="" alt="Icon Preview" style="width: 32px; height: 32px; display: none; border: 1px solid #ccc; margin-right: 10px;"/>
                <div class="icon-inputs">
                    <input type="text" id="appIconUrl" placeholder="Enter image URL">
                    <span style="margin: 0 5px;">or</span>
                    <button id="uploadButton">Upload File</button>
                </div>
            </div>

            <label for="appHtml">HTML Content:</label>
        `;
    }
}
