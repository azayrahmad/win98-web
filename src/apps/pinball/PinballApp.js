import { Application } from "../Application.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { ICONS } from "../../config/icons.js";
import {
  setupEmscriptenFS,
  teardownEmscriptenFS,
  setupIframeInactivity,
} from "../../utils/emscripten-utils.js";

export class PinballApp extends Application {
  static config = {
    id: "pinball",
    title: "Space Cadet Pinball",
    description: "Play a classic game of pinball.",
    icon: ICONS.pinball,
    width: 620,
    height: 480,
    resizable: false,
    maximizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.isMounted = false;
    this.baseLocalPath = "/C:/Program Files/Pinball";
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
    });

    const menuBar = this._createMenuBar();
    win.setMenuBar(menuBar);

    const iframe = document.createElement("iframe");
    iframe.src = "games/pinball/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    setupIframeInactivity(this.iframe);

    return win;
  }

  _createMenuBar() {
    return new window.MenuBar({
      "&Game": [
        {
          label: "&New Game",
          shortcutLabel: "F2",
          action: () => this.sendKey("F2"),
        },
        "MENU_DIVIDER",
        {
          label: "&Launch Ball",
          shortcutLabel: "Space",
          action: () => this.sendKey(" "),
        },
        {
          label: "&Pause/Resume",
          shortcutLabel: "F3",
          action: () => this.sendKey("F3"),
        },
        "MENU_DIVIDER",
        {
          label: "E&xit",
          action: () => this.win.close(),
        },
      ],
      "&Options": [
        {
          label: "Full Screen",
          action: () => this.toggleFullScreen(),
        },
        {
          label: "Player &Keys...",
          action: () => this.showPlayerKeysDialog(),
        },
      ],
      "&Help": [
        {
          label: "&About Pinball",
          action: () => {
            ShowDialogWindow({
              title: "About Pinball",
              text: "3D Pinball for Windows - Space Cadet<br>Emscripten port by alula<br><br>Integrated into azOS by Jules.",
              buttons: [{ label: "OK", isDefault: true }],
            });
          },
        },
      ],
    });
  }

  async _onLaunch() {
    window.addEventListener("message", this._boundHandleMessage);
    this.win.focus();
  }

  async _handleMessage(event) {
    if (event.data && event.data.type === "PINBALL_READY") {
      this.isMounted = await setupEmscriptenFS(this.iframe, this.baseLocalPath);
      if (this.isMounted) {
        this._startGame();
      }
    }
  }

  _startGame() {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const guestWindow = this.iframe.contentWindow;

    if (typeof guestWindow.callMain === "function") {
      guestWindow.callMain([]);
    } else if (guestWindow.Module && guestWindow.Module.callMain) {
      guestWindow.Module.callMain([]);
    }
  }

  sendKey(key) {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const event = new KeyboardEvent("keydown", {
      key: key,
      code: key,
      bubbles: true,
      cancelable: true,
    });
    this.iframe.contentWindow.dispatchEvent(event);
    setTimeout(() => {
      const eventUp = new KeyboardEvent("keyup", {
        key: key,
        code: key,
        bubbles: true,
        cancelable: true,
      });
      this.iframe.contentWindow.dispatchEvent(eventUp);
    }, 100);
  }

  toggleFullScreen() {
    if (this.iframe) {
      this.iframe.requestFullscreen();
    }
  }

  showPlayerKeysDialog() {
    const dialogText = `
            <div style="text-align: left; padding: 0 20px;">
                <p><b>Left Flipper:</b> Z</p>
                <p><b>Right Flipper:</b> / (Slash)</p>
                <p><b>Left Table Bump:</b> X</p>
                <p><b>Right Table Bump:</b> . (Period)</p>
                <p><b>Plunger:</b> Spacebar</p>
            </div>
        `;
    ShowDialogWindow({
      title: "Player Keys",
      text: dialogText,
      buttons: [{ label: "OK", isDefault: true }],
    });
  }

  async _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);

    if (this.isMounted) {
      await teardownEmscriptenFS(this.iframe, this.baseLocalPath, ["SpaceCadetPinball.data"]);
      this.isMounted = false;
    }
  }
}
