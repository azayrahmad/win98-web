import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";

export class DosBoxApp extends IFrameApplication {
  static config = {
    id: "dosbox",
    title: "MS-DOS Player",
    description: "Run DOS applications.",
    icon: ICONS.msdos,
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.exePath = null;
    this.baseDir = null;
    this._boundHandleMessage = this._handleMessage.bind(this);
    this._saved = false;
    this._isSaving = false;
  }

  _createWindow(data) {
    let title = this.config.title;

    // Only override title if we are the generic DosBox app
    if (this.id === "dosbox") {
      let filePath = "";
      if (typeof data === 'string') {
          filePath = data;
      } else if (data && (data.filePath || data.file)) {
          filePath = data.filePath || data.file;
      }
      if (filePath) {
          title = `MS-DOS Prompt - ${filePath.split('/').pop()}`;
      }
    }

    const win = new window.$Window({
      title: title,
      outerWidth: this.config.width,
      outerHeight: this.config.height,
      resizable: this.config.resizable,
      maximizable: this.config.maximizable,
      icons: this.config.icon,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "apps/dosbox/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    this._setupIframeForInactivity(this.iframe);

    this.win.on('close', (e) => {
      if (this._isSaving) {
        e.preventDefault();
        return;
      }
      if (!this._saved && this.iframe && this.iframe.contentWindow) {
        e.preventDefault();
        this._isSaving = true;
        // Request save from iframe
        this.iframe.contentWindow.postMessage({ type: "REQUEST_SAVE" }, "*");
        // We will call this.win.close() again once we receive DOSBOX_SAVE
      }
    });

    return win;
  }

  async _onLaunch(data) {
    let filePath = "";
    if (typeof data === 'string') {
        filePath = data;
    } else if (data && (data.filePath || data.file)) {
        filePath = data.filePath || data.file;
    }

    if (filePath) {
      this.exePath = filePath;
      this.baseDir = filePath.substring(0, filePath.lastIndexOf("/"));
    }
    window.addEventListener("message", this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (event.source !== this.iframe.contentWindow) return;

    if (event.data && event.data.type === "DOSBOX_READY") {
      if (this.baseDir) {
        await this._syncDirectoryToDosBox(this.baseDir);
        const relativeExe = this.exePath.substring(this.baseDir.length + 1);
        this.iframe.contentWindow.postMessage({ type: "START_EXE", exe: relativeExe }, "*");
      } else {
        this.iframe.contentWindow.postMessage({ type: "START_EXE", exe: null }, "*");
      }
    } else if (event.data && event.data.type === "DOSBOX_SAVE") {
      if (event.data.data) {
        await this._handleSave(event.data.data);
      }
      this._saved = true;
      this._isSaving = false;
      this.win.close();
    }
  }

  async _handleSave(zipData) {
    if (!zipData || !this.baseDir) return;

    try {
      const { unzipSync } = await import("fflate");
      const unzipped = unzipSync(new Uint8Array(zipData));
      for (const [path, data] of Object.entries(unzipped)) {
        if (path.endsWith("/")) continue;
        const fullPath = `${this.baseDir}/${path}`;
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (!fs.existsSync(dir)) {
          await fs.promises.mkdir(dir, { recursive: true });
        }
        await fs.promises.writeFile(fullPath, data);
      }
      // Notify system about file changes
      document.dispatchEvent(
        new CustomEvent("zen-fs-change", {
          detail: { path: this.baseDir },
        }),
      );
    } catch (e) {
      console.error("Failed to extract DosBox save data:", e);
    }
  }

  async _syncDirectoryToDosBox(dirPath, subDir = "") {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = `${dirPath}/${entry.name}`;
        const relativePath = subDir ? `${subDir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            await this._syncDirectoryToDosBox(fullPath, relativePath);
        } else {
            const data = await fs.promises.readFile(fullPath);
            this.iframe.contentWindow.postMessage({
                type: "WRITE_FILE",
                path: relativePath,
                data: data
            }, "*");
        }
    }
  }

  _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);
  }
}
