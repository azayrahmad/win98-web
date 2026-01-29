import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import "./flashplayer.css";
import { isZenFSPath, getZenFSFileAsBlob } from "../../utils/zenfs-utils.js";

export class FlashPlayerApp extends Application {
  static config = {
    id: "flashplayer",
    title: "Flash Player",
    icon: ICONS.flashPlayer,
    width: 550,
    height: 400,
    resizable: true,
  };

  constructor(config) {
    super(config);
    this.player = null;
  }

  _createWindow() {
    this.win = new $Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    const menuBar = this._createMenuBar();
    this.win.setMenuBar(menuBar);

    const container = document.createElement("div");
    container.className = "flashplayer-container";

    const loadingMessage = document.createElement("div");
    loadingMessage.className = "flashplayer-loading-message";
    loadingMessage.textContent = "Please Wait...";
    loadingMessage.style.display = "none"; // Initially hidden
    container.appendChild(loadingMessage);

    this.win.$content.append(container);

    return this.win;
  }

  _createMenuBar() {
    return new MenuBar({
      "&File": [
        {
          label: "&Open...",
          action: () => this.openFile(),
        },
        "MENU_DIVIDER",
        {
          label: "E&xit",
          action: () => this.win.close(),
        },
      ],
    });
  }

  async _onLaunch(data) {
    await this.waitForRuffle();
    window.RufflePlayer.config = {
      splashScreen: false,
      autoplay: "on",
    };
    if (data) {
      this.loadSwf(data);
    }
  }

  openFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".swf";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadSwf(file);
      }
    };
    input.click();
  }

  loadSwf(fileData) {
    if (!window.RufflePlayer) {
      ShowDialogWindow({
        title: "Error",
        text: "Ruffle Player is not available.",
        buttons: [{ label: "OK", isDefault: true }],
      });
      return;
    }

    const container = this.win.element.querySelector(".flashplayer-container");
    const loadingMessage = container.querySelector(
      ".flashplayer-loading-message"
    );
    loadingMessage.style.display = "block";

    // Clear previous player if it exists
    if (this.player) {
      this.player.remove();
    }

    const ruffle = window.RufflePlayer.newest();
    this.player = ruffle.createPlayer();
    container.appendChild(this.player);

    this.player.addEventListener("loadedmetadata", () => {
      loadingMessage.style.display = "none";
    });

    const handleError = (e) => {
      console.error(`Ruffle failed to load the file: ${e}`);
      ShowDialogWindow({
        title: "Error",
        text: "Could not load the specified SWF file.",
        buttons: [{ label: "OK", isDefault: true }],
      });
    };

    if (typeof fileData === "string") {
      // It's a URL or path from launch data
      if (isZenFSPath(fileData)) {
        getZenFSFileAsBlob(fileData).then(async blob => {
          const arrayBuffer = await blob.arrayBuffer();
          this.player.load({ data: arrayBuffer }).catch(handleError);
        }).catch(handleError);
      } else {
        this.player.load(fileData).catch(handleError);
      }
    } else if (fileData instanceof File) {
      // It's a File object from the file input
      const reader = new FileReader();
      reader.onload = (event) => {
        this.player.load({ data: event.target.result }).catch(handleError);
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        handleError(e);
      };
      reader.readAsArrayBuffer(fileData);
    } else if (typeof fileData === "object" && fileData.content) {
      // It's a briefcase file object with base64 content
      try {
        const byteString = atob(fileData.content.split(",")[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        this.player.load({ data: arrayBuffer }).catch(handleError);
      } catch (e) {
        handleError(e);
      }
    } else if (typeof fileData === "object" && fileData.contentUrl) {
      // It's a virtual file object from Explorer
      this.player.load(fileData.contentUrl).catch(handleError);
    } else {
      handleError("Invalid file data provided.");
    }
  }

  waitForRuffle() {
    return new Promise((resolve) => {
      if (window.RufflePlayer) {
        return resolve();
      }
      const interval = setInterval(() => {
        if (window.RufflePlayer) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
}
