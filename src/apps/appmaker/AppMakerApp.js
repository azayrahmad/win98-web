import { Application } from '../Application.js';
import { ShowDialogWindow } from '../../components/DialogWindow.js';
import './appmaker.css';
import '../../components/notepad-editor.css';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from '../../utils/localStorage.js';
import { registerCustomApp } from '../../utils/customAppManager.js';
import { NotepadEditor } from '../../components/NotepadEditor.js';
import { renderHTML } from '../../utils/domUtils.js';
import { ICONS } from '../../config/icons.js';

export class AppMakerApp extends Application {
    static config = {
        id: "appmaker",
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
        this.appIconFileInput = container.querySelector('#appIconFile');

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

        uploadButton.addEventListener('click', () => {
            this.appIconFileInput.click();
        });

        this.appIconFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.appIconPreview.src = e.target.result;
                    this.appIconPreview.style.display = 'block';
                    this.appIcon = e.target.result; // This is the data URL
                    this.appIconUrlInput.value = ''; // Clear URL input
                };
                reader.readAsDataURL(file);
            }
        });

        this._updateTitle();
    }

    _updateTitle() {
        const appName = this.appNameInput.value;
        const newTitle = appName ? `${appName} - App Maker` : 'App Maker';
        this.win.title(newTitle);
    }

    _openHtmlFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const htmlContent = event.target.result;
                const fileName = file.name.replace(/\.html$/, '');
                this.appNameInput.value = fileName;
                this.editor.setValue(htmlContent);
                this._updateTitle();
            };
            reader.readAsText(file);
        };
        input.click();
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

                        // Notify desktop to refresh if needed
                        document.dispatchEvent(new CustomEvent('zen-fs-change', { detail: { path: '/C:/WINDOWS/Desktop' } }));
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
                    <input type="file" id="appIconFile" accept="image/*" style="display: none;">
                </div>
            </div>

            <label for="appHtml">HTML Content:</label>
        `;
    }
}
