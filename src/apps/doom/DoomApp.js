import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { setupEmscriptenFS, teardownEmscriptenFS } from "../../utils/emscripten-utils.js";

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
      if (this.iframe && this.iframe.contentWindow) {
        this.isMounted = await setupEmscriptenFS(
          this.iframe.contentWindow.Module,
          this.baseLocalPath,
        );
      }
      this._startGame();
    }
  }

  _startGame() {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const guestWindow = this.iframe.contentWindow;
    const commonArgs = [
      "-iwad", "doom1.wad",
      "-window",
      "-nogui",
      "-nomusic",
      "-config", "default.cfg",
      "-servername", "doomflare",
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
      await teardownEmscriptenFS(
        this.iframe.contentWindow.Module,
        this.baseLocalPath,
        ["doom1.wad"],
      );
      this.isMounted = false;
    }
  }
}
