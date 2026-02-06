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
      title: this.filePath ? `DOSBox - ${this.filePath.split("/").pop()}` : this.title,
      outerWidth: 640,
      outerHeight: 480,
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

    win.$content.append(iframe);
    this.iframe = iframe;

    return win;
  }

  async _onClose() {
    if (this.iframe && this.iframe.contentWindow && this.iframe.contentWindow.ci) {
      const ci = this.iframe.contentWindow.ci;
      // In v8, ci.save() might be used for persistence
      if (typeof ci.persist === 'function') {
          const fflate = this.iframe.contentWindow.fflate;
          try {
            const changes = await ci.persist();
            if (changes) {
              const unzipped = fflate.unzipSync(changes);
              for (const [path, data] of Object.entries(unzipped)) {
                const fullPath = this.directory + "/" + path;
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
              }
              document.dispatchEvent(new CustomEvent("fs-change", { detail: { path: this.directory } }));
            }
          } catch (e) {
            console.error("Failed to persist DOSBox changes:", e);
          }
      } else if (typeof ci.save === 'function') {
          try {
              // Best effort save
              await ci.save();
          } catch (e) {
              console.error("Failed to call ci.save():", e);
          }
      }
    }
  }
}
