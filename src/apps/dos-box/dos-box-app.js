import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs, mounts } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

export class DosBoxApp extends Application {
  static config = [
    {
      id: "dos-box",
      title: "DOSBox",
      description: "DOSBox-X Emulator",
      icon: ICONS.msdos,
      category: "",
      width: 640,
      height: 480,
      resizable: true,
      maximizable: true,
      isSingleton: false,
    },
    {
      id: "wolf3d",
      title: "Wolfenstein 3D",
      description: "Play Wolfenstein 3D",
      icon: ICONS.msdos,
      category: "Accessories/Games",
      width: 640,
      height: 480,
    }
  ];

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this._boundHandleMessage = this._handleMessage.bind(this);
    this.executablePath = null;
    this.args = [];
    this.syncedDrives = [];
  }

  async _createWindow(data) {
    if (this.id === 'wolf3d') {
      this.executablePath = "/C:/Games/WOLF3D/WOLF3D.EXE";
    } else if (typeof data === 'string') {
      this.executablePath = data;
    } else if (data && data.path) {
      this.executablePath = data.path;
      this.args = data.args || [];
    }

    const win = new window.$Window({
      title: this.executablePath ? `DOSBox - ${this.executablePath.split('/').pop()}` : this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
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

    return win;
  }

  async _onLaunch() {
    window.addEventListener("message", this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (event.data && event.data.type === "DOSBOX_READY") {
      await this._setupFileSystem();
      this._startEmulator();
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

    // 1. Identify all mounted drives in host ZenFS
    const drivesToSync = [];
    for (const [path, mount] of mounts) {
        if (path.match(/^\/[A-Z]:$/i)) {
            drivesToSync.push(path);
        }
    }
    // Always ensure C: is included
    if (!drivesToSync.includes("/C:")) drivesToSync.push("/C:");

    this.syncedDrives = [];

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

    for (const localDrivePath of drivesToSync) {
        const driveLetter = localDrivePath.substring(1, 2).toUpperCase();
        const guestDrivePath = `/mnt/${driveLetter.toLowerCase()}`;

        try {
            if (this.iframe.contentWindow.showStatus) {
                this.iframe.contentWindow.showStatus(`Syncing Drive ${driveLetter}:...`, 0);
            }
            await this._ensureEmDir(FS, guestDrivePath);
            await loadRecursive(localDrivePath, guestDrivePath);
            this.syncedDrives.push({
                local: localDrivePath,
                guest: guestDrivePath,
                letter: driveLetter
            });
        } catch (e) {
            console.warn(`Failed to sync drive ${localDrivePath}:`, e);
        }
    }

    if (this.iframe.contentWindow.showStatus) {
        this.iframe.contentWindow.showStatus("Sync complete.", 1000);
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

    let dosCommands = "";

    // Mount all synced drives
    for (const drive of this.syncedDrives) {
        dosCommands += `mount ${drive.letter.toLowerCase()} ${drive.guest}\n`;
    }

    if (this.executablePath) {
      const parts = this.executablePath.split("/").filter(Boolean);
      const drivePart = parts[0].toUpperCase(); // e.g. "C:" or "A:"
      const exe = parts.pop();

      const dirParts = drivePart.match(/^[A-Z]:$/) ? parts.slice(1) : parts;
      const dir = dirParts.join("\\");
      const driveLetter = drivePart.charAt(0);

      dosCommands += `${driveLetter}:\n`;
      if (dir) {
          dosCommands += `cd \\${dir}\n`;
      }
      dosCommands += `${exe} ${this.args.join(" ")}\n`;
    } else {
      dosCommands += "C:\n";
    }

    if (guestWindow.startWithCommands) {
      guestWindow.startWithCommands(dosCommands);
    }
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.iframe && this.iframe.contentWindow && this.iframe.contentWindow.Module) {
      const FS = this.iframe.contentWindow.Module.FS;

      // 1. Collect files from iframe FS to sync back
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

      for (const drive of this.syncedDrives) {
          // Skip E: (CD-ROM) as it's typically read-only or an ISO we don't want to persist back to host ZenFS root
          if (drive.letter === 'E') continue;
          collectFiles(drive.guest, drive.guest, drive.local);
      }

      // 2. Unmount from host ZenFS
      if (this.isMounted) {
          try {
            fs.umount(this.mountPath);
            this.isMounted = false;
          } catch (e) {
            console.error("Failed to unmount DOSBox FS:", e);
          }
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

      // Notify system of changes for each writable drive
      for (const drive of this.syncedDrives) {
          if (drive.letter === 'E') continue;
          document.dispatchEvent(
            new CustomEvent("zen-fs-change", { detail: { path: drive.local } }),
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
