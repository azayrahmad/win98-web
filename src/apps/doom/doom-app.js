import { WindowedApplication } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";
import { DoomProgressDialog } from './doom-progress-dialog.js';

const WAD_NAMES = {
  "doom1.wad": "Doom Shareware",
  "doom.wad": "The Ultimate Doom",
  "doom2.wad": "Doom II: Hell on Earth",
  "tnt.wad": "Final Doom: TNT Evilution",
  "plutonia.wad": "Final Doom: The Plutonia Experiment",
  "doom2f.wad": "Doom II French",
  "freedoom1.wad": "Freedoom: Phase 1",
  "freedoom2.wad": "Freedoom: Phase 2",
  "freedm.wad": "FreeDM",
  "heretic.wad": "Heretic: Shadow of the Serpent Riders",
  "hexen.wad": "Hexen: Beyond Heretic",
  "strife1.wad": "Strife: Quest for the Sigil",
};

export class DoomApp extends WindowedApplication {
  static config = {
    id: "doom",
    title: "Doom",
    description: "Play the classic game Doom.",
    icon: ICONS.doom, category: "",
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.isDownloading = false;
    this.baseLocalPath = "/C:/Program Files/Doom";
    this.availableWads = [];
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _createWindow() {
    const win = this.kernel.use('ui').createWindow({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.config.maximizable,
      allowFullscreen: this.config.allowFullscreen,
      startFullscreen: this.config.startFullscreen,
      icons: this.icon,
      id: "doom", // Fixed ID for easier testing/access
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/doom/index.html";
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
    if (event.data && event.data.type === "DOOM_READY") {
      await this._checkAndLaunch();
    } else if (event.data && event.data.type === "DOOM_EXIT") {
      if (this.win) {
        this.win.close();
      }
    }
  }

  async _checkAndLaunch() {
    const wads = await this._scanForWads();

    if (wads.length > 0) {
      await this._setupFileSystem();
      if (this.availableWads.length > 1) {
        this._showWadSelectionDialog();
      } else {
        this._startGame(this.availableWads[0]);
      }
    } else {
      this._showDownloadConfirmationDialog();
    }
  }

  async _scanForWads() {
    try {
      if (!fs.existsSync(this.baseLocalPath)) {
        await this._mkdirRecursive(this.baseLocalPath);
        return [];
      }
      const entries = await fs.promises.readdir(this.baseLocalPath);
      return entries.filter((e) => e.toLowerCase().endsWith(".wad"));
    } catch (e) {
      console.error("Failed to scan for WADs", e);
      return [];
    }
  }

  _showDownloadConfirmationDialog() {
    this.kernel.use('ui').showDialog({
      title: "No Doom files found",
      text: "No Doom WAD files were found in your system.<br><br>Would you like to download the shareware version (doom1.wad) to play?",
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
    const remotePath = `${baseUrl}games/doom/`.replace(/\/+/g, "/");
    const files = ["doom1.wad", "default.cfg"];

    const dialog = new DoomProgressDialog({
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

        await fs.promises.writeFile(`${this.baseLocalPath}/${file.name}`, buffer);
      }

      dialog.close();
      this.isDownloading = false;
      await this._checkAndLaunch();
    } catch (e) {
      console.error("Download failed", e);
      dialog.close();
      this.isDownloading = false;
      this.kernel.use('ui').showDialog({
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
      console.error("Doom guest module or FS not found");
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

    // 2. Scan for available WADs
    try {
      const entries = await fs.promises.readdir(this.baseLocalPath);
      this.availableWads = entries.filter((e) => e.toLowerCase().endsWith(".wad"));

      // Sort wads so doom1.wad is usually first or just sort alphabetically
      this.availableWads.sort((a, b) => {
        if (a.toLowerCase() === "doom1.wad") return -1;
        if (b.toLowerCase() === "doom1.wad") return 1;
        return a.localeCompare(b);
      });
    } catch (e) {
      this.availableWads = [];
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

  _showWadSelectionDialog() {
    const content = document.createElement("div");
    content.style.padding = "10px";

    const label = document.createElement("label");
    label.textContent = "Select Game Version:";
    label.style.display = "block";
    label.style.marginBottom = "8px";

    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "4px";

    this.availableWads.forEach((wad) => {
      const option = document.createElement("option");
      option.value = wad;
      const prettyName = WAD_NAMES[wad.toLowerCase()] || wad;
      option.textContent = prettyName;
      select.appendChild(option);
    });

    content.appendChild(label);
    content.appendChild(select);

    this.kernel.use('ui').showDialog({
      title: "Doom WAD Selection",
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

  _startGame(wadFile = "doom1.wad") {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const guestWindow = this.iframe.contentWindow;
    const commonArgs = [
      "-iwad",
      wadFile,
      "-window",
      "-nogui",
      "-nomusic",
      "-config",
      "default.cfg",
      "-servername",
      "doomflare",
    ];

    if (typeof guestWindow.callMain === "function") {
      guestWindow.callMain(commonArgs);
    } else if (guestWindow.Module && guestWindow.Module.callMain) {
      guestWindow.Module.callMain(commonArgs);
    }
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.isMounted && this.iframe && this.iframe.contentWindow) {
      const FS = this.iframe.contentWindow.Module.FS;

      // 1. Collect files from iframe FS to sync back
      const syncData = [];
      const collectFiles = (path) => {
        const entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
        for (const entry of entries) {
          const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
          try {
            const stat = FS.stat(fullPath);
            if (FS.isDir(stat.mode)) {
              collectFiles(fullPath);
            } else {
              // Optimization: Don't sync back large WAD files
              if (entry.toLowerCase().endsWith(".wad")) continue;

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
        console.error("Failed to unmount Doom FS:", e);
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
