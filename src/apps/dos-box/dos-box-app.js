import { Application } from "../../system/application.js";
import { ICONS } from "../../config/icons.js";
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

export class DosBoxApp extends Application {
  static config = [
    {
      id: "dos-box",
      title: "DOSBox",
      description: "DOSBox-X Emulator",
      icon: ICONS.msdos,
      category: null,
      width: 640,
      height: 480,
      resizable: true,
      maximizable: true,
      allowFullscreen: true,
      startFullscreen: true,
      isSingleton: false,
    },
  ];

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.baseLocalPath = "/C:"; // Mount root of C: drive
    this._boundHandleMessage = this._handleMessage.bind(this);
    this.executablePath = null;
    this.args = [];
  }

  async _createWindow(data) {
    if (typeof data === "string") {
      this.executablePath = data;
    } else if (data && data.path) {
      this.executablePath = data.path;
      this.args = data.args || [];
    }

    const win = new window.$Window({
      title: this.executablePath
        ? `DOSBox - ${this.executablePath.split("/").pop()}`
        : this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      allowFullscreen: this.config.allowFullscreen,
      startFullscreen: this.config.startFullscreen,
      icons: this.icon,
    });

    const iframe = document.createElement("iframe");
    // We'll use a custom host.html for better integration
    iframe.src = "games/dos/doswasmx/host.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    win.on("focus", () => {
      iframe.focus();
    });

    return win;
  }

  async _onLaunch() {
    window.addEventListener("message", this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (event.data && event.data.type === "DOSBOX_READY") {
      await this._setupFileSystem();
      this._startEmulator();
    } else if (event.data && event.data.type === "DOSBOX_EXIT") {
      if (this.win) {
        this.win.close();
      }
    }
  }

  async _setupFileSystem() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    const guestModule = this.iframe.contentWindow.Module;
    if (!guestModule || !guestModule.FS) {
      console.error("DOSBox guest module or FS not found");
      return;
    }

    const FS = guestModule.FS;

    // 1. Sync files from host ZenFS to iframe MEMFS
    // We sync the game directory to a matching path in the guest

    let localSyncPath = "/C:/Games";
    if (this.executablePath) {
      const parts = this.executablePath.split("/");
      parts.pop(); // Remove filename
      localSyncPath = parts.join("/") || "/C:/Games";
    }

    // Convert local path (e.g. /C:/Games/WOLF3D) to guest path (e.g. /Games/WOLF3D)
    // by removing the /C: prefix if present
    const guestSyncPath = localSyncPath.startsWith("/C:")
      ? localSyncPath.substring(3) || "/"
      : localSyncPath;

    try {
      const loadRecursive = async (localPath, emPath) => {
        if (!fs.existsSync(localPath)) return;
        const entries = await fs.promises.readdir(localPath);
        for (const entry of entries) {
          const fullLocalPath = `${localPath}/${entry}`;
          const fullEmPath =
            emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
          try {
            const stat = await fs.promises.stat(fullLocalPath);
            if (stat.isDirectory()) {
              try {
                FS.mkdir(fullEmPath);
              } catch (e) {}
              await loadRecursive(fullLocalPath, fullEmPath);
            } else {
              const data = await fs.promises.readFile(fullLocalPath);
              FS.writeFile(fullEmPath, new Uint8Array(data));
            }
          } catch (e) {
            console.warn(`Failed to sync ${fullLocalPath}`, e);
          }
        }
      };

      await this._ensureEmDir(FS, guestSyncPath);
      await loadRecursive(localSyncPath, guestSyncPath);
      this.syncedPath = localSyncPath;
      this.guestSyncedPath = guestSyncPath;
    } catch (e) {
      console.warn("Failed to load persistent files from ZenFS:", e);
    }

    // 2. Mount iframe's FS to host ZenFS
    try {
      const emscriptenFS = Emscripten.create({ FS: FS });
      // Mount to a temporary location in ZenFS so we can see it
      this.mountPath = `/mnt/dosbox-${Math.random().toString(36).substr(2, 9)}`;
      if (!fs.existsSync("/mnt")) await fs.promises.mkdir("/mnt");
      await fs.promises.mkdir(this.mountPath);
      fs.mount(this.mountPath, emscriptenFS);
      this.isMounted = true;
    } catch (e) {
      console.error("Failed to mount Emscripten FS:", e);
    }
  }

  async _ensureEmDir(FS, path) {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      try {
        FS.mkdir(current);
      } catch (e) {}
    }
  }

  _startEmulator() {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const guestWindow = this.iframe.contentWindow;

    let dosCommands = "c:\n";
    if (this.executablePath) {
      const parts = this.executablePath.split("/").filter(Boolean);
      const exe = parts.pop();
      const dirParts =
        parts.length > 0 && parts[0].toUpperCase() === "C:"
          ? parts.slice(1)
          : parts;
      const dir = dirParts.join("\\");
      dosCommands = `C:\r\ncd \\${dir}\r\n${exe} ${this.args.join(" ")}\r\necho QUIT_DOSBOX\r\nexit\r\n`;
    }

    if (guestWindow.startWithCommands) {
      guestWindow.startWithCommands(dosCommands);
    }
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.isMounted && this.iframe && this.iframe.contentWindow) {
      const FS = this.iframe.contentWindow.Module.FS;

      // 1. Collect files from iframe FS to sync back
      const syncData = [];
      const collectFiles = (path, guestPrefix, localPrefix) => {
        try {
          const entries = FS.readdir(path).filter(
            (e) => e !== "." && e !== "..",
          );
          for (const entry of entries) {
            const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
            try {
              const stat = FS.stat(fullPath);
              if (FS.isDir(stat.mode)) {
                collectFiles(fullPath, guestPrefix, localPrefix);
              } else {
                // Map back to local path
                const relativePath = fullPath.substring(guestPrefix.length);
                const targetLocalPath = localPrefix + relativePath;
                syncData.push({
                  path: targetLocalPath,
                  data: new Uint8Array(FS.readFile(fullPath)),
                });
              }
            } catch (e) {}
          }
        } catch (e) {}
      };
      collectFiles(this.guestSyncedPath, this.guestSyncedPath, this.syncedPath);

      // 2. Unmount from host ZenFS
      try {
        fs.umount(this.mountPath);
        this.isMounted = false;
      } catch (e) {
        console.error("Failed to unmount DOSBox FS:", e);
      }

      // 3. Persist changed files back to host ZenFS (IndexedDB)
      for (const item of syncData) {
        const targetPath = item.path;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        if (!fs.existsSync(targetDir)) {
          await this._mkdirRecursive(targetDir);
        }
        await fs.promises.writeFile(targetPath, item.data);
      }

      document.dispatchEvent(
        new CustomEvent("zen-fs-change", { detail: { path: this.syncedPath } }),
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
