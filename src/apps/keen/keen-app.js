import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

const EPISODE_NAMES = {
  "keen1": "Episode 1: Marooned on Mars",
  "keen2": "Episode 2: The Earth Explodes",
  "keen3": "Episode 3: Keen Must Die!",
};

export class KeenApp extends Application {
  static config = {
    id: "keen",
    title: "Commander Keen",
    description: "Play the classic game Commander Keen.",
    icon: ICONS.keen, category: "",
    width: 672,
    height: 414,
    resizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.baseLocalPath = "/C:/Program Files/Keen";
    this.availableEpisodes = [];
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      innerWidth: this.config.width,
      innerHeight: this.config.height,
      resizable: this.config.resizable,
      icons: this.icon,
      id: "keen",
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/keen/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    return win;
  }

  async _onLaunch() {
    window.addEventListener("message", this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (event.data && event.data.type === "KEEN_READY") {
      await this._setupFileSystem();
      if (this.availableEpisodes.length > 1) {
        this._showEpisodeSelectionDialog();
      } else {
        this._startGame(this.availableEpisodes[0] || "keen1");
      }
    } else if (event.data && event.data.type === "KEEN_EXIT") {
      if (this.win) {
        this.win.close();
      }
    }
  }

  async _setupFileSystem() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    const guestModule = this.iframe.contentWindow.Module;
    if (!guestModule || !guestModule.FS) {
      console.error("Keen guest module or FS not found");
      return;
    }

    const FS = guestModule.FS;

    // 1. Sync persistent files from host ZenFS to iframe MEMFS
    try {
      const loadRecursive = async (localPath, emPath) => {
        if (!fs.existsSync(localPath)) return;
        const entries = await fs.promises.readdir(localPath);
        for (const entry of entries) {
          const fullLocalPath = `${localPath}/${entry}`;
          const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
          const stat = await fs.promises.stat(fullLocalPath);
          if (stat.isDirectory()) {
            try { FS.mkdir(fullEmPath); } catch (e) {}
            await loadRecursive(fullLocalPath, fullEmPath);
          } else {
            const data = await fs.promises.readFile(fullLocalPath);
            FS.writeFile(fullEmPath, new Uint8Array(data));
          }
        }
      };
      await loadRecursive(this.baseLocalPath, "/");
    } catch (e) {
      console.warn("Failed to load persistent files from ZenFS:", e);
    }

    // 2. Scan for available Episodes
    try {
      this.availableEpisodes = [];
      const gamedataPath = `${this.baseLocalPath}/GAMEDATA`;
      if (fs.existsSync(gamedataPath)) {
          const entries = await fs.promises.readdir(gamedataPath);
          for (const entry of ["KEEN1", "KEEN2", "KEEN3"]) {
            const fullPath = `${gamedataPath}/${entry}`;
            if (fs.existsSync(fullPath)) {
              const files = await fs.promises.readdir(fullPath);
              if (files.length > 0) {
                this.availableEpisodes.push(entry.toLowerCase());
              }
            }
          }
      }

      if (this.availableEpisodes.length === 0) {
        this.availableEpisodes = ["keen1"];
      }

      this.availableEpisodes.sort();
    } catch (e) {
      this.availableEpisodes = ["keen1"];
    }

    // 3. Mount iframe's FS to host ZenFS
    try {
      const emscriptenFS = Emscripten.create({ FS: FS });
      fs.mount(this.baseLocalPath, emscriptenFS);
      this.isMounted = true;
      document.dispatchEvent(
        new CustomEvent("zen-fs-change", {
          detail: { path: this.baseLocalPath },
        }),
      );
    } catch (e) {
      console.error("Failed to mount Emscripten FS:", e);
    }
  }

  _showEpisodeSelectionDialog() {
    const content = document.createElement("div");
    content.style.padding = "10px";

    const label = document.createElement("label");
    label.textContent = "Select Episode:";
    label.style.display = "block";
    label.style.marginBottom = "8px";

    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "4px";

    this.availableEpisodes.forEach((ep) => {
      const option = document.createElement("option");
      option.value = ep;
      const prettyName = EPISODE_NAMES[ep] || ep;
      option.textContent = prettyName;
      select.appendChild(option);
    });

    content.appendChild(label);
    content.appendChild(select);

    ShowDialogWindow({
      title: "Commander Keen Episode Selection",
      content: content,
      modal: true,
      buttons: [
        {
          label: "OK",
          isDefault: true,
          action: () => {
            this._startGame(select.value);
          },
        },
        {
          label: "Cancel",
          action: () => {
            this.win.close();
          },
        },
      ],
    });
  }

  _startGame(episode = "keen1") {
    if (!this.iframe || !this.iframe.contentWindow) return;
    this.iframe.contentWindow.postMessage({
      type: "START_GAME",
      args: [`-start${episode}`]
    }, "*");
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.isMounted && this.iframe && this.iframe.contentWindow) {
      const guestModule = this.iframe.contentWindow.Module;
      if (!guestModule || !guestModule.FS) {
          try {
            fs.umount(this.baseLocalPath);
            this.isMounted = false;
          } catch (e) {}
          return;
      }
      const FS = guestModule.FS;

      // 1. Collect files from iframe FS to sync back
      const syncData = [];
      const collectFiles = (path) => {
        let entries;
        try {
            entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
        } catch (e) {
            return;
        }
        for (const entry of entries) {
          const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
          try {
            const stat = FS.stat(fullPath);
            if (FS.isDir(stat.mode)) {
              collectFiles(fullPath);
            } else {
              const upperEntry = entry.toUpperCase();

              // Optimization: Only sync files that are likely to be user-modified
              const isSaveFile = upperEntry.startsWith("SAVED") && upperEntry.endsWith(".CK1");
              const isScoreFile = upperEntry === "SCORES.CK1";
              const isConfigFile = upperEntry === "CONFIG.CK1";

              if (upperEntry.endsWith(".CK1")) {
                  if (!isSaveFile && !isScoreFile && !isConfigFile) {
                      continue;
                  }
              } else if (upperEntry.endsWith(".EXE") ||
                         upperEntry.endsWith(".DOC") ||
                         upperEntry.endsWith(".FRM") ||
                         upperEntry.endsWith(".TXT") || // readme files etc
                         upperEntry.endsWith(".BINARY") ||
                         upperEntry.endsWith(".JS") ||
                         upperEntry.endsWith(".WASM") ||
                         upperEntry.endsWith(".DATA")) {
                  continue;
              }

              syncData.push({
                path: fullPath,
                data: new Uint8Array(FS.readFile(fullPath)),
              });
            }
          } catch (e) {}
        }
      };

      collectFiles("/");

      // 2. Unmount from host ZenFS
      try {
        fs.umount(this.baseLocalPath);
        this.isMounted = false;
      } catch (e) {
        console.error("Failed to unmount Keen FS:", e);
      }

      // 3. Persist changed files back to host ZenFS (IndexedDB)
      for (const item of syncData) {
        const targetPath = `${this.baseLocalPath}${item.path}`;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        if (!fs.existsSync(targetDir)) {
          await this._mkdirRecursive(targetDir);
        }
        await fs.promises.writeFile(targetPath, item.data);
      }

      document.dispatchEvent(
        new CustomEvent("zen-fs-change", { detail: { path: this.baseLocalPath } }),
      );
    }
  }

  async _mkdirRecursive(path) {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      if (!fs.existsSync(current)) {
        await fs.promises.mkdir(current);
      }
    }
  }
}
