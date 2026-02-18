import { Application } from '../../system/application.js';
import { fs } from "@zenfs/core";
import { ICONS } from '../../config/icons.js';
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import { setItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import './paint.css'; // I'll create this file to import all paint styles

export class PaintApp extends Application {
    static config = {
        id: "paint",
        title: "Paint",
        description: "Create and edit images.",
        icon: ICONS.paint, category: "Accessories",
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.initialized = false;
    }

    _mapFormats(formats) {
        return formats.map(f => ({
            label: f.nameWithExtensions || f.name,
            extensions: f.extensions
        }));
    }

    async _getFileFromPath(path) {
        const buffer = await fs.promises.readFile(path);
        const name = path.split('/').pop();
        return new File([buffer], name);
    }

    _setupSystemHooks() {
        window.systemHooks = window.systemHooks || {};

        window.systemHooks.showOpenFileDialog = async ({ formats }) => {
            const path = await ShowFilePicker({
                title: "Open",
                mode: "open",
                fileTypes: this._mapFormats(formats)
            });
            if (path) {
                const file = await this._getFileFromPath(path);
                return { file, fileHandle: path };
            }
            return null;
        };

        window.systemHooks.showSaveFileDialog = async ({ formats, defaultFileName, getBlob, savedCallbackUnreliable }) => {
            const path = await ShowFilePicker({
                title: "Save As",
                mode: "save",
                fileTypes: this._mapFormats(formats),
                suggestedName: defaultFileName
            });
            if (path) {
                const extension = path.split('.').pop().toLowerCase();
                const format = formats.find(f => f.extensions.includes(extension)) || formats[0];
                const blob = await getBlob(format.formatID);
                await fs.promises.writeFile(path, new Uint8Array(await blob.arrayBuffer()));

                savedCallbackUnreliable?.({
                    newFileName: path.split('/').pop(),
                    newFileFormatID: format.formatID,
                    newFileHandle: path,
                    newBlob: blob,
                });
            }
        };

        window.systemHooks.writeBlobToHandle = async (handle, blob) => {
            if (typeof handle === 'string') {
                await fs.promises.writeFile(handle, new Uint8Array(await blob.arrayBuffer()));
                return true;
            }
            return false;
        };

        window.systemHooks.readBlobFromHandle = async (handle) => {
            if (typeof handle === 'string') {
                return await this._getFileFromPath(handle);
            }
            throw new Error("Invalid handle");
        };

        window.systemHooks.updateTitle = (title) => {
            if (this.win) {
                this.win.title(title);
            }
        };

        window.systemHooks.setWallpaperTiled = async (canvas) => {
            await this._setWallpaper(canvas, "tile");
        };

        window.systemHooks.setWallpaperCentered = async (canvas) => {
            await this._setWallpaper(canvas, "center");
        };

        // Override window.close for jspaint to use our window component
        if (window.close !== this._myClose) {
            this._originalClose = window.close;
            this._myClose = () => {
                if (this.win && !this.win.closed) {
                    this.win.close();
                } else if (this._originalClose) {
                    this._originalClose.call(window);
                }
            };
            window.close = this._myClose;
        }
    }

    async openFile(data) {
        let path = data;
        let file = null;

        if (data && typeof data === 'object') {
            if (data instanceof File) {
                file = data;
            } else {
                path = data.filePath || data.file || data;
                if (path instanceof File) {
                    file = path;
                }
            }
        }

        const { open_from_file } = await import('./src/functions.js');

        if (file) {
            open_from_file(file, file);
            return;
        }

        if (typeof path === 'string') {
            if (path.startsWith('/') && !path.startsWith('http')) {
                try {
                    const file = await this._getFileFromPath(path);
                    open_from_file(file, path);
                } catch (e) {
                    console.error("Failed to open file from ZenFS", e);
                }
            }
        }
    }

    _createWindow() {
        const win = new $Window({
            id: this.id,
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
        });

        win.on("close", async (e) => {
            if (!window.saved) {
                e.preventDefault();
                const { are_you_sure } = await import('./src/functions.js');
                are_you_sure(() => {
                    win.close(true);
                });
            }
        });

        win.element.style.display = 'flex';
        win.$content.addClass("paint-container");
        return win;
    }

    _onClose() {
        if (window.close === this._myClose) {
            window.close = this._originalClose;
        }
        this._myClose = null;
        this._originalClose = null;

        // Detach the app container from the window before it's destroyed.
        // This is crucial because jQuery's .remove() (used by $Window)
        // recursively removes all event handlers from child elements.
        if (window.$app) {
            window.$app.detach();
        }

        this._disposePaint();
    }

    async _disposePaint() {
        try {
            const { reset_file, reset_selected_colors, reset_canvas_and_history, set_magnification, deselect } = await import('./src/functions.js');
            const { default_magnification } = await import('./src/app-state.js');

            deselect();
            reset_file();
            reset_selected_colors();
            reset_canvas_and_history();
            set_magnification(default_magnification);

            // Additional resets to prevent unresponsiveness on relaunch
            window.pointer_active = false;
            window.pointer_buttons = 0;
            window.pointers = [];
            if (window.$G) {
                window.$G.triggerHandler("pointerup");
                window.$G.triggerHandler("blur");
            }
        } catch (e) {
            console.error("Failed to dispose Paint state", e);
        }
    }

    async _onLaunch(data) {
        if (!this.win) {
            this.win = this._createWindow();
            this._setupWindow(this.id, this.isSingleton ? this.id : this.id + Date.now());
        }

        // Update global container reference for the current window
        window.paintAppContainer = this.win.$content[0];

        if (window.$app) {
            this._injectHTML();
            this.win.$content.append(window.$app);
            this._setupSystemHooks();
            this._setupDragAndDrop();
            this.initialized = true;
            $(window).trigger("resize");
            $(window).trigger("option-changed");
            this.win.focus();
            if (data) {
                this.openFile(data);
            }
            return;
        }

        if (this.initialized) {
            this.win.focus();
            return;
        }

        // We need to load dependencies that were in <script> tags in index.html
        await this._loadDependencies();

        // Inject HTML fragments that app.js expects
        this._injectHTML();

        // Load localization first as it provides the global `localize`
        await import('./src/app-localization.js');

        // Setup hooks
        this._setupSystemHooks();

        // Import the main app. This will execute the code.
        // We need to make sure app.js uses window.paintAppContainer
        await import('./src/app.js');

        this.initialized = true;
        this.win.focus();

        if (data) {
            this.openFile(data);
        }

        this._setupDragAndDrop();
    }

    async _setWallpaper(canvas, mode) {
        await import('./src/app-localization.js');
        const localize = window.localize;
        const { image_formats } = await import('./src/file-format-data.js');
        const { write_image_file, update_title, update_from_saved_file } = await import('./src/functions.js');

        const doSet = (path) => {
            setItem(LOCAL_STORAGE_KEYS.WALLPAPER, path);
            setItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, mode);
            document.dispatchEvent(new CustomEvent("wallpaper-changed"));
        };

        const isZenFSPath = (path) => typeof path === 'string' && path.startsWith('/');

        if (window.saved && isZenFSPath(window.system_file_handle)) {
            doSet(window.system_file_handle);
            return;
        }

        if (isZenFSPath(window.system_file_handle)) {
            // Dirty but has a ZenFS path. Save it automatically (like File > Save)
            const extension = window.system_file_handle.split('.').pop().toLowerCase();
            const format = image_formats.find(f => f.extensions.includes(extension)) || image_formats[0];

            return new Promise((resolve) => {
                write_image_file(canvas, format.mimeType, async (blob) => {
                    const success = await window.systemHooks.writeBlobToHandle(window.system_file_handle, blob);
                    if (success) {
                        window.saved = true;
                        update_title();
                        doSet(window.system_file_handle);
                    }
                    resolve();
                });
            });
        }

        // Untitled or not in ZenFS. Show Save As dialog.
        // This matches File > Save for untitled files.
        const fileName = window.file_name || "wallpaper";
        const defaultFileName = `${fileName.replace(/\.(bmp|dib|a?png|gif|jpe?g|jpe|jfif|tiff?|webp|raw)$/i, "") || "wallpaper"} wallpaper.png`;

        window.systemHooks.showSaveFileDialog({
            dialogTitle: localize("Save As"),
            defaultFileName,
            defaultFileFormatID: "image/png",
            formats: image_formats,
            getBlob: (new_file_type) => {
                return new Promise((resolve) => {
                    write_image_file(canvas, new_file_type, (blob) => {
                        resolve(blob);
                    });
                });
            },
            savedCallbackUnreliable: ({ newFileName, newFileFormatID, newFileHandle, newBlob }) => {
                if (newFileHandle) {
                    window.saved = true;
                    window.system_file_handle = newFileHandle;
                    window.file_name = newFileName;
                    window.file_format = newFileFormatID;
                    update_title();
                    update_from_saved_file(newBlob);
                    doSet(newFileHandle);
                }
            },
        });
    }

    _setupDragAndDrop() {
        this.win.$content.off("dragover drop");
        this.win.$content.on("dragover", (e) => {
            const dt = e.originalEvent.dataTransfer;
            if (dt && dt.types.includes("application/x-zenfs-path")) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        this.win.$content.on("drop", async (e) => {
            const dt = e.originalEvent.dataTransfer;
            const zenfsPath = dt.getData("application/x-zenfs-path");
            if (zenfsPath) {
                e.preventDefault();
                e.stopPropagation();
                this.openFile(zenfsPath);
            }
        });
    }

    async _loadDependencies() {
        const libs = [
            '/win98-web/apps/paint/lib/pako-2.0.3.min.js',
            '/win98-web/apps/paint/lib/UPNG.js',
            '/win98-web/apps/paint/lib/UTIF.js',
            '/win98-web/apps/paint/lib/bmp.js',
            '/win98-web/apps/paint/lib/FileSaver.js',
            '/win98-web/apps/paint/lib/font-detective.js',
            '/win98-web/apps/paint/lib/libtess.min.js',
            '/win98-web/apps/paint/lib/imagetracer_v1.2.5.js',
        ];

        for (const lib of libs) {
            await this._loadScript(lib);
        }
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    _injectHTML() {
        // Remove existing fragments if any (to avoid duplicate IDs)
        this.win.$content.find('#about-paint, #news, #jspaint-svg-filters').remove();

        // These are from index.html
        const aboutPaint = document.createElement('div');
        aboutPaint.id = 'about-paint';
        aboutPaint.style.display = 'none';
        aboutPaint.innerHTML = `
            <div id="about-paint-header">
                <img src="/win98-web/apps/paint/images/icons/128x128.png" width="128" height="128" id="about-paint-icon" alt="" />
                <div id="about-paint-beside-icon">
                    <h1 id="jspaint-project-name">JS Paint</h1>
                    <div id="jspaint-version">Version 1.0.0+</div>
                    <div id="jspaint-update-status-area" hidden>
                        <div id="maybe-outdated-line">
                            <div id="outdated" hidden>Outdated</div>
                            <div id="checking-for-updates" hidden>Checking for updates...</div>
                            <div id="failed-to-check-if-outdated" hidden>Failed to check</div>
                        </div>
                    </div>
                </div>
                <button id="view-project-news">What's New?</button>
            </div>
            <p>MS Paint remake by <a href="https://isaiahodhner.io/" target="_blank">Isaiah Odhner</a></p>
        `;
        this.win.$content.append(aboutPaint);

        const news = document.createElement('div');
        news.id = 'news';
        news.hidden = true;
        // Minimal news content or load it from index.html if needed
        this.win.$content.append(news);

        // SVG filters from index.html
        const svgFilters = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgFilters.id = 'jspaint-svg-filters';
        svgFilters.style.position = "absolute";
        svgFilters.style.pointerEvents = "none";
        svgFilters.style.bottom = "100%";
        svgFilters.innerHTML = `
            <defs>
                <filter id="disabled-inset-filter" x="0" y="0" width="1px" height="1px">
                    <feColorMatrix in="SourceGraphic" type="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        -1000 -1000 -1000 1 0
                    " result="black-parts-isolated" />
                    <feFlood result="shadow-color" flood-color="var(--ButtonShadow)" />
                    <feFlood result="hilight-color" flood-color="var(--ButtonHilight)" />
                    <feOffset in="black-parts-isolated" dx="1" dy="1" result="offset" />
                    <feComposite in="hilight-color" in2="offset" operator="in" result="hilight-colored-offset" />
                    <feComposite in="shadow-color" in2="black-parts-isolated" operator="in" result="shadow-colored" />
                    <feMerge>
                        <feMergeNode in="hilight-colored-offset" />
                        <feMergeNode in="shadow-colored" />
                    </feMerge>
                </filter>
            </defs>
        `;
        this.win.$content.append(svgFilters);
    }
}
