import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

export class DosBoxApp extends Application {
  static config = {
    id: "doswasmx",
    title: "DOSBox",
    description: "DOSBox emulator for running DOS games and applications.",
    icon: ICONS.msdos,
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    isSingleton: false, // Allow multiple instances for different games
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.baseLocalPath = "/C:/"; // Mount the entire C: drive
    this._boundHandleMessage = this._handleMessage.bind(this);
    this.launchFilePath = null;
  }

  async _createWindow(filePath) {
    this.launchFilePath = filePath;
    const win = new window.$Window({
      title: this.title + (filePath ? ` - ${filePath.split('/').pop()}` : ""),
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
      id: `doswasmx-${Math.random().toString(36).substr(2, 9)}`,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "doswasmx/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    return win;
  }

  async _onLaunch(filePath) {
    window.addEventListener("message", this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (event.data && event.data.type === "DOSBOX_READY" && event.source === this.iframe.contentWindow) {
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

    // 1. Sync files from host ZenFS to iframe MEMFS
    console.log("[DosBoxApp] Syncing files to iframe...");

    try {
      const loadRecursive = async (localPath, emPath) => {
        if (!fs.existsSync(localPath)) return;
        const entries = await fs.promises.readdir(localPath);
        for (const entry of entries) {
          const fullLocalPath = `${localPath}/${entry}`;
          const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;

          // Skip WINDOWS directory for performance
          if (entry.toUpperCase() === 'WINDOWS') continue;

          const stat = await fs.promises.stat(fullLocalPath);
          if (stat.isDirectory()) {
            try { FS.mkdir(fullEmPath); } catch (e) {}
            // Always go into GAMES folder for Wolf3D test
            if (entry.toUpperCase() === 'GAMES' || (this.launchFilePath && this.launchFilePath.startsWith(fullLocalPath))) {
                await loadRecursive(fullLocalPath, fullEmPath);
            }
          } else {
            const data = await fs.promises.readFile(fullLocalPath);
            FS.writeFile(fullEmPath, new Uint8Array(data));
          }
        }
      };

      try { FS.mkdir('/game'); } catch (e) {}
      await loadRecursive("/C:", "/game");
      console.log("[DosBoxApp] File sync complete.");

    } catch (e) {
      console.warn("Failed to load files from ZenFS to DOSBox:", e);
    }

    // 4. Mount iframe's FS to host ZenFS at a temporary path so we can see modifications
    try {
      const emscriptenFS = Emscripten.create({ FS: FS });
      const mountPath = `/C:/DOSBOX_SESSION_${Math.random().toString(36).substr(2, 5)}`;
      await fs.promises.mkdir(mountPath);
      fs.mount(mountPath, emscriptenFS);
      this.sessionMountPath = mountPath;
      this.isMounted = true;
    } catch (e) {
      console.error("Failed to mount Emscripten FS to host:", e);
    }
  }

  _startEmulator() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    const commands = [
        "MOUNT C /game",
        "C:"
    ];

    if (this.launchFilePath) {
        // Convert /C:/GAMES/WOLF3D/WOLF3D.EXE -> C:\GAMES\WOLF3D\WOLF3D.EXE
        let dosPath = this.launchFilePath;
        if (dosPath.startsWith('/C:')) {
            dosPath = 'C:' + dosPath.substring(3).replace(/\//g, '\\');
        } else {
            dosPath = dosPath.replace(/\//g, '\\');
        }

        // Find the directory to CD into it first
        const lastBackslash = dosPath.lastIndexOf('\\');
        if (lastBackslash > 0) {
            const dir = dosPath.substring(0, lastBackslash);
            const exe = dosPath.substring(lastBackslash + 1);
            commands.push(`CD ${dir.substring(2)}`); // Remove C:
            commands.push(exe);
        } else {
            commands.push(dosPath);
        }
    }

    this.iframe.contentWindow.postMessage({
        type: 'START_DOSBOX',
        commands: commands
    }, '*');
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.isMounted && this.iframe && this.iframe.contentWindow) {
      const guestModule = this.iframe.contentWindow.Module;
      if (guestModule && guestModule.FS) {
          const FS = guestModule.FS;

          // 1. Sync back changed files from /game in iframe to /C: in host
          const collectFiles = async (emPath, localPath) => {
            const entries = FS.readdir(emPath).filter((e) => e !== "." && e !== "..");
            for (const entry of entries) {
              const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
              const fullLocalPath = localPath === "/" ? `/${entry}` : `${localPath}/${entry}`;
              try {
                const stat = FS.stat(fullEmPath);
                if (FS.isDir(stat.mode)) {
                  await collectFiles(fullEmPath, fullLocalPath);
                } else {
                  // Only sync back if modified or it's a known game file extension (e.g. .SAV, .DAT)
                  // For now, sync everything in /game back to /C:
                  if (emPath.startsWith('/game')) {
                      const targetLocalPath = "/C:" + fullEmPath.substring(5);
                      const data = FS.readFile(fullEmPath);

                      const targetDir = targetLocalPath.substring(0, targetLocalPath.lastIndexOf("/"));
                      if (!fs.existsSync(targetDir)) {
                          await this._mkdirRecursive(targetDir);
                      }
                      await fs.promises.writeFile(targetLocalPath, new Uint8Array(data));
                  }
                }
              } catch (e) {}
            }
          };

          await collectFiles("/game", "/C:");

          // 2. Unmount session path
          if (this.sessionMountPath) {
            try {
              fs.umount(this.sessionMountPath);
              await fs.promises.rmdir(this.sessionMountPath);
            } catch (e) {
              console.error("Failed to unmount session path:", e);
            }
          }
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
