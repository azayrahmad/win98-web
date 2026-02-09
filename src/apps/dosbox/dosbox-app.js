import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from '@zenfs/core';

export class DosBoxApp extends IFrameApplication {
  static config = {
    id: "dosbox",
    title: "DOSBox",
    description: "MS-DOS Emulator",
    icon: ICONS.msdos,
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.currentData = null;
  }

  _createWindow(data) {
    this.currentData = data;
    const win = new window.$Window({
      title: this.title + (data ? ` - ${data}` : ""),
      outerWidth: 640,
      outerHeight: 520, // Extra space for some UI if needed
      icons: this.icon,
      resizable: true,
      maximizeButton: true,
      minimizeButton: true,
    });

    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    // Using import.meta.env.BASE_URL to ensure correct path
    const baseUrl = import.meta.env.BASE_URL || "/";
    iframe.src = `${baseUrl}games/dos/doswasmx/host.html`;

    win.$content.append(iframe);
    this.iframe = iframe;

    this._setupIframeForInactivity(iframe);

    // Listen for messages from the iframe
    window.addEventListener("message", this._handleMessage.bind(this));

    return win;
  }

  async _onLaunch(data) {
    this.currentData = data;
  }

  async _handleMessage(event) {
    if (event.source !== this.iframe.contentWindow) return;

    const { type, payload } = event.data;

    switch (type) {
      case "READY":
        await this._syncFilesToDosBox();
        break;
      case "SAVE_FILES":
        await this._saveFilesFromDosBox(payload);
        break;
      case "EXIT":
        this.win.close();
        break;
    }
  }

  async _syncFilesToDosBox() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    // Determine which files to sync.
    // If data is a path to an EXE, we might want to sync its directory.
    // For now, let's sync /C:/Games/WOLF3D if it's Wolf3D,
    // or just the directory containing the exe.

    let syncPath = "/C:";
    let executable = "";

    if (this.currentData && typeof this.currentData === "string") {
        executable = this.currentData;
        // Find directory of executable
        const parts = executable.split("/");
        parts.pop();
        syncPath = parts.join("/");
    }

    if (!syncPath.startsWith("/C:")) {
        syncPath = "/C:"; // Default to root of C if not specified
    }

    const files = await this._readDirectoryRecursive(syncPath);

    this.iframe.contentWindow.postMessage({
      type: "START_DOSBOX",
      payload: {
        files,
        executable: executable.replace("/C:", "C:").replace(/\//g, "\\"),
        workingDir: syncPath.replace("/C:", "C:").replace(/\//g, "\\")
      }
    }, window.location.origin);
  }

  async _readDirectoryRecursive(path) {
    const results = [];
    const entries = await fs.promises.readdir(path, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = `${path}/${entry.name}`;
      if (entry.isDirectory()) {
        const subFiles = await this._readDirectoryRecursive(fullPath);
        results.push(...subFiles);
      } else {
        const content = await fs.promises.readFile(fullPath);
        results.push({
          path: fullPath.replace("/C:", "C:").replace(/\//g, "\\"),
          content: content.buffer
        });
      }
    }
    return results;
  }

  async _saveFilesFromDosBox(files) {
    for (const file of files) {
      const zenPath = "/" + file.path.replace(/\\/g, "/");
      // Ensure directory exists
      const dir = zenPath.substring(0, zenPath.lastIndexOf("/"));
      if (!fs.existsSync(dir)) {
          await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(zenPath, new Uint8Array(file.content));
    }
    console.log("Files saved back to ZenFS");
  }

  _onClose() {
    window.removeEventListener("message", this._handleMessage.bind(this));
    // Optionally trigger one last sync
    if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage({ type: "REQUEST_SAVE" }, window.location.origin);
    }
  }
}
