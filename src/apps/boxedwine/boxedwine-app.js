import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";

export class BoxedwineApp extends Application {
  static config = [
    {
      id: "boxedwine",
      title: "Boxedwine",
      description: "Boxedwine - Windows Emulator",
      icon: ICONS.shell,
      category: "",
      width: 800,
      height: 600,
      resizable: true,
      maximizable: true,
      allowFullscreen: true,
      startFullscreen: false,
      isSingleton: false,
    },
    {
        id: "skifree",
        title: "SkiFree",
        description: "Classic Skiing Game",
        icon: ICONS.shell,
        category: "Accessories/Games",
        width: 640,
        height: 480,
        allowFullscreen: true,
    }
  ];

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.executablePath = null;
    this.args = [];
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _createWindow(data) {
    if (this.id === 'skifree') {
        this.executablePath = "/C:/Games/SkiFree/SKI32.EXE";
    } else if (typeof data === 'string') {
      this.executablePath = data;
    } else if (data && data.path) {
      this.executablePath = data.path;
      this.args = data.args || [];
    }

    const win = new window.$Window({
      title: this.executablePath ? `Boxedwine - ${this.executablePath.split('/').pop()}` : this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      allowFullscreen: this.config.allowFullscreen,
      startFullscreen: this.config.startFullscreen,
      icons: this.icon,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "apps/boxedwine/host.html";
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
    if (event.data && event.data.type === "BOXEDWINE_READY") {
      await this._setupFileSystem();
      this._startEmulator();
    }
  }

  async _setupFileSystem() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    const guestModule = this.iframe.contentWindow.Module;
    if (!guestModule || !guestModule.FS) {
      console.error("Boxedwine guest module or FS not found");
      return;
    }

    const FS = guestModule.FS;

    const guestBaseDir = "/mnt/c";
    try {
        await this._ensureEmDir(FS, guestBaseDir);
    } catch (e) {}

    let localSyncPath = "/C:/Games";
    if (this.executablePath) {
        const parts = this.executablePath.split('/');
        parts.pop();
        localSyncPath = parts.join('/') || "/C:";
    }

    this.syncedPath = localSyncPath;
    const relativePath = localSyncPath.startsWith("/C:") ? localSyncPath.substring(3) : localSyncPath;
    const guestSyncPath = guestBaseDir + (relativePath.startsWith("/") ? relativePath : "/" + relativePath);
    this.guestSyncedPath = guestSyncPath;

    try {
      const loadRecursive = async (localPath, emPath) => {
        if (!fs.existsSync(localPath)) return;
        const entries = await fs.promises.readdir(localPath);
        for (const entry of entries) {
          const fullLocalPath = `${localPath}/${entry}`;
          const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
          try {
              const stat = await fs.promises.stat(fullLocalPath);
              if (stat.isDirectory()) {
                try { FS.mkdir(fullEmPath); } catch (e) {}
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
    } catch (e) {
      console.warn("Failed to load files from ZenFS into Boxedwine:", e);
    }
  }

  async _ensureEmDir(FS, path) {
      const parts = path.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
          current += '/' + part;
          try { FS.mkdir(current); } catch (e) {}
      }
  }

  _startEmulator() {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const guestWindow = this.iframe.contentWindow;

    const args = [
        "-root", "/root",
        "-zip", "boxedwine.zip",
        "-mount_drive", "/mnt/c", "c"
    ];

    if (this.executablePath) {
        const relativePath = this.executablePath.startsWith("/C:") ? this.executablePath.substring(3) : this.executablePath;
        const guestExePath = "/mnt/c" + (relativePath.startsWith("/") ? relativePath : "/" + relativePath);
        args.push("-p");
        args.push(guestExePath);
    }

    if (this.args && this.args.length > 0) {
        args.push(...this.args);
    }

    if (guestWindow.startWithArgs) {
      guestWindow.startWithArgs(args);
    }
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.iframe && this.iframe.contentWindow) {
      const guestModule = this.iframe.contentWindow.Module;
      if (!guestModule || !guestModule.FS) return;
      const FS = guestModule.FS;

      const syncData = [];
      const collectFiles = (path, guestPrefix, localPrefix) => {
        try {
            const entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
            for (const entry of entries) {
              const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
              try {
                const stat = FS.stat(fullPath);
                if (FS.isDir(stat.mode)) {
                  collectFiles(fullPath, guestPrefix, localPrefix);
                } else {
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

      if (this.guestSyncedPath && this.syncedPath) {
          collectFiles(this.guestSyncedPath, this.guestSyncedPath, this.syncedPath);

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
