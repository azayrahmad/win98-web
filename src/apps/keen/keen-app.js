import { WindowedApplication } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";
import { KeenProgressDialog } from './keen-progress-dialog.js';

const EPISODE_NAMES = {
  "keen1": "Episode 1: Marooned on Mars",
  "keen2": "Episode 2: The Earth Explodes",
  "keen3": "Episode 3: Keen Must Die!",
};

export class KeenApp extends WindowedApplication {
  static config = {
    id: "keen",
    title: "Commander Keen",
    description: "Play the classic game Commander Keen.",
    icon: ICONS.keen, category: "",
    width: 672,
    height: 414,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
    isSingleton: true,
  };

  constructor(config, services) {
    super(config, services);
    this.iframe = null;
    this.isMounted = false;
    this.isDownloading = false;
    this.baseLocalPath = "/C:/Program Files/Keen";
    this.availableEpisodes = [];
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _createWindow() {
    const win = this.services.ui.createWindow({
      title: this.title,
      innerWidth: this.config.width,
      innerHeight: this.config.height,
      resizable: this.config.resizable,
      maximizable: this.config.maximizable,
      allowFullscreen: this.config.allowFullscreen,
      startFullscreen: this.config.startFullscreen,
      icons: this.icon,
      id: "keen",
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/keen/index.html";
    iframe.allow = "fullscreen";
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
      await this._checkAndLaunch();
    } else if (event.data && event.data.type === "KEEN_EXIT") {
      if (this.win) {
        this.win.close();
      }
    }
  }

  async _checkAndLaunch() {
    const episodes = await this._scanForEpisodes();

    if (episodes.length > 0) {
      await this._setupFileSystem();
      if (this.availableEpisodes.length > 1) {
        this._showEpisodeSelectionDialog();
      } else {
        this._startGame(this.availableEpisodes[0]);
      }
    } else {
      this._showDownloadConfirmationDialog();
    }
  }

  async _scanForEpisodes() {
    try {
      const gamedataPath = `${this.baseLocalPath}/GAMEDATA`;
      if (!fs.existsSync(gamedataPath)) {
        await this._mkdirRecursive(gamedataPath);
        return [];
      }

      const episodes = [];
      const entries = await fs.promises.readdir(gamedataPath);
      for (const entry of ["KEEN1", "KEEN2", "KEEN3"]) {
        const fullPath = `${gamedataPath}/${entry}`;
        if (fs.existsSync(fullPath)) {
          const files = await fs.promises.readdir(fullPath);
          if (files.length > 0) {
            episodes.push(entry.toLowerCase());
          }
        }
      }
      return episodes;
    } catch (e) {
      console.error("Failed to scan for Keen episodes", e);
      return [];
    }
  }

  _showDownloadConfirmationDialog() {
    this.services.ui.showDialog({
      title: "No Commander Keen files found",
      text: "No Commander Keen game files were found in your system.<br><br>Would you like to download the shareware version (Episode 1) to play?",
      modal: true,
      parentWindow: this.win,
      buttons: [
        {
          label: "OK",
          isDefault: true,
          action: () => {
            this._downloadShareware();
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

  async _downloadShareware() {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const baseUrl = import.meta.env.BASE_URL || "/";
    const remotePath = `${baseUrl}games/keen/GAMEDATA/KEEN1/`.replace(/\/+/g, "/");
    const localPath = `${this.baseLocalPath}/GAMEDATA/KEEN1`;
    const files = [
      "CTLPANEL.CK1", "EGAHEAD.CK1", "EGALATCH.CK1", "EGASPRIT.CK1",
      "ENDTEXT.CK1", "FINALE.CK1", "HELPTEXT.CK1", "KEEN1.EXE",
      "LEVEL01.CK1", "LEVEL02.CK1", "LEVEL03.CK1", "LEVEL04.CK1",
      "LEVEL05.CK1", "LEVEL06.CK1", "LEVEL07.CK1", "LEVEL08.CK1",
      "LEVEL09.CK1", "LEVEL10.CK1", "LEVEL11.CK1", "LEVEL12.CK1",
      "LEVEL13.CK1", "LEVEL14.CK1", "LEVEL15.CK1", "LEVEL16.CK1",
      "LEVEL80.CK1", "LEVEL81.CK1", "LEVEL90.CK1", "ORDER.FRM",
      "PREVIEW2.CK1", "PREVIEW3.CK1", "PREVIEWS.CK1", "SCORES.CK1",
      "SOUNDS.CK1", "STORYTXT.CK1", "VENDOR.DOC",
    ];

    if (!fs.existsSync(localPath)) {
      await this._mkdirRecursive(localPath);
    }

    const dialog = new KeenProgressDialog({
      title: "Downloading Shareware",
      parentWindow: this.win,
      onCancel: () => {
        this.isDownloading = false;
        this.win.close();
      },
    });

    try {
      let totalSize = 0;
      const fileData = [];

      // First pass to get total size
      for (const file of files) {
        const response = await fetch(remotePath + file, { method: "HEAD" });
        const size = parseInt(response.headers.get("content-length") || "0", 10);
        totalSize += size;
        fileData.push({ name: file, size });
      }
      dialog.setTotalSize(totalSize);

      let downloadedSize = 0;
      for (const file of fileData) {
        const response = await fetch(remotePath + file.name);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const reader = response.body.getReader();
        const chunks = [];
        let fileDownloaded = 0;

        while (true) {
          if (dialog.cancelled) {
            this.isDownloading = false;
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          fileDownloaded += value.length;
          downloadedSize += value.length;
          dialog.update(`Downloading ${file.name}...`, downloadedSize);
        }

        const buffer = new Uint8Array(fileDownloaded);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }

        await fs.promises.writeFile(`${localPath}/${file.name}`, buffer);
      }

      dialog.close();
      this.isDownloading = false;
      await this._checkAndLaunch();
    } catch (e) {
      console.error("Download failed", e);
      dialog.close();
      this.isDownloading = false;
      this.services.ui.showDialog({
        title: "Download Failed",
        text: `Error downloading shareware: ${e.message}`,
        buttons: [
          {
            label: "OK",
            isDefault: true,
            action: () => {
              this.win.close();
            },
          },
        ],
        modal: true,
      });
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

      this.availableEpisodes.sort();
    } catch (e) {
      this.availableEpisodes = [];
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

    this.services.ui.showDialog({
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
