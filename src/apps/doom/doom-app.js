import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

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

export class DoomApp extends Application {
  static config = {
    id: "doom",
    title: "Doom",
    description: "Play the classic game Doom.",
    icon: ICONS.doom,
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.baseLocalPath = "/C:/Program Files/Doom";
    this.availableWads = [];
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
      id: "doom", // Fixed ID for easier testing/access
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/doom/index.html";
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
      await this._setupFileSystem();
      if (this.availableWads.length > 1) {
        this._showWadSelectionDialog();
      } else {
        this._startGame(this.availableWads[0] || "doom1.wad");
      }
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

      // Ensure doom1.wad is present in the list as it's the built-in default
      const hasDoom1 = this.availableWads.some(
        (w) => w.toLowerCase() === "doom1.wad",
      );
      if (!hasDoom1) {
        this.availableWads.push("doom1.wad");
      }

      // Sort wads so doom1.wad is usually first or just sort alphabetically
      this.availableWads.sort((a, b) => {
        if (a.toLowerCase() === "doom1.wad") return -1;
        if (b.toLowerCase() === "doom1.wad") return 1;
        return a.localeCompare(b);
      });
    } catch (e) {
      this.availableWads = ["doom1.wad"];
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

    ShowDialogWindow({
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
