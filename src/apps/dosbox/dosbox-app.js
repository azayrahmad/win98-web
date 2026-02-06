import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";

export class DosBoxApp extends Application {
  static config = {
    id: "dosbox",
    title: "DOSBox",
    description: "Generic DOSBox emulator.",
    icon: ICONS.msdos,
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.filePath = null;
    this.directory = null;
  }

  _createWindow(filePath) {
    this.filePath = filePath;
    if (this.filePath) {
      this.directory = this.filePath.substring(0, this.filePath.lastIndexOf("/"));
    }

    const win = new window.$Window({
      title: this.filePath ? `DOSBox-X - ${this.filePath.split("/").pop()}` : `DOSBox-X`,
      outerWidth: 640,
      outerHeight: 510, // Extra for controls
      resizable: true,
      maximizable: true,
      icons: this.icon,
    });

    this.win = win;

    const iframe = document.createElement("iframe");
    const params = new URLSearchParams();
    if (this.filePath) params.set("executable", this.filePath.split("/").pop());
    if (this.directory) params.set("directory", this.directory);

    const baseUrl = import.meta.env.BASE_URL || "/";
    iframe.src = `${baseUrl}apps/dosbox/index.html?${params.toString()}`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    // Handle messages from the iframe (e.g., persistence)
    const handleMessage = async (event) => {
        if (event.data && event.data.type === "dosbox-persistence") {
            const { changes, directory } = event.data;
            await this._saveChanges(changes, directory);
        }
    };
    window.addEventListener("message", handleMessage);

    win.onClosed(() => {
        window.removeEventListener("message", handleMessage);
    });

    win.$content.append(iframe);
    this.iframe = iframe;

    return win;
  }

  async _saveChanges(changes, directory) {
    const fflate = window.fflate || (window.System ? window.System.fflate : null);
    if (!fflate) {
        // Try to import it dynamically if not available
        try {
            const mod = await import('fflate');
            this.fflate = mod;
        } catch (e) {
            console.error("fflate not found for saving changes");
            return;
        }
    } else {
        this.fflate = fflate;
    }

    try {
        const unzipped = this.fflate.unzipSync(new Uint8Array(changes));
        for (const [path, data] of Object.entries(unzipped)) {
            const fullPath = directory + "/" + path;
            const dirPath = fullPath.substring(0, fullPath.lastIndexOf("/"));

            const parts = dirPath.split("/").filter(Boolean);
            let current = "";
            for (const part of parts) {
                current += "/" + part;
                if (!fs.existsSync(current)) {
                    await fs.promises.mkdir(current);
                }
            }

            await fs.promises.writeFile(fullPath, data);
            console.log(`[DosBoxApp] Persisted: ${fullPath}`);
        }
        document.dispatchEvent(new CustomEvent("fs-change", { detail: { path: directory } }));
    } catch (e) {
        console.error("Failed to save DOSBox changes:", e);
    }
  }

  async _onClose() {
    // We already handle persistence via messages, but we can trigger one last save here if possible.
    if (this.iframe && this.iframe.contentWindow && this.iframe.contentWindow.ci) {
        const ci = this.iframe.contentWindow.ci;
        try {
            const changes = await ci.persist(true);
            if (changes) {
                await this._saveChanges(changes, this.directory);
            }
        } catch (e) {
            console.warn("Final persistence failed on close:", e);
        }
    }
  }
}
