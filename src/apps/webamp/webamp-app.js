import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { appManager } from '../../system/app-manager.js';
import { getWebampMenuItems } from './webamp.js';
import { isZenFSPath, getZenFSFileUrl, getZenFSFileAsText } from '../../system/zenfs-utils.js';

let webampInstance = null;
let webampContainer = null;

export class WebampApp extends Application {
  static config = {
    id: "webamp",
    title: "Winamp",
    description: "A classic music player.",
    icon: ICONS.webamp,
    category: "",
    hasTaskbarButton: true,
    isSingleton: true,
    tray: {
      contextMenu: getWebampMenuItems,
    },
    tips: [
      "Webamp is a music player that looks and feels like the classic Winamp.",
      "You can minimize and restore Webamp using its button in the taskbar.",
    ],
  };

  constructor(config) {
    super(config);
    this.hasTaskbarButton = true;
    this.blobUrls = [];
    this.webampInstance = null;
  }

  _revokeBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  _createWindow() {
    if (!webampContainer) {
      webampContainer = document.createElement("div");
      webampContainer.id = "webamp-container";
      webampContainer.classList.add("window", "os-window", "app-window");
      webampContainer.style.position = "absolute";
      webampContainer.style.zIndex = window.System
        ? window.System.incrementZIndex()
        : $Window.Z_INDEX++;

      const screen =
        document.getElementById("desktop-area") ||
        document.getElementById("screen") ||
        document.body;
      screen.appendChild(webampContainer);

      webampContainer.addEventListener(
        "mousedown",
        () => {
          if (this.win) this.win.focus();
        },
        true,
      );
    }

    const shim = {
      element: webampContainer,
      onClosed: (cb) => {
        this._onClosedCallback = cb;
        return () => {
          this._onClosedCallback = null;
        };
      },
      onFocus: (cb) => {
        this._onFocusCallback = cb;
        return () => {
          this._onFocusCallback = null;
        };
      },
      onBlur: (cb) => {
        this._onBlurCallback = cb;
        return () => {
          this._onBlurCallback = null;
        };
      },
      center: () => {
        webampContainer.style.left = "calc(50% - 137px)";
        webampContainer.style.top = "calc(50% - 58px)";
      },
      focus: () => {
        this.bringToFront();
        webampContainer.classList.add("focused");
        if (this._onFocusCallback) this._onFocusCallback();
      },
      blur: () => {
        webampContainer.classList.remove("focused");
        if (this._onBlurCallback) this._onBlurCallback();
      },
      bringToFront: () => {
        if (window.System) {
          webampContainer.style.zIndex = window.System.incrementZIndex();
        } else {
          webampContainer.style.zIndex = $Window.Z_INDEX++;
        }
      },
      minimize: () => {
        this.minimizeWebamp();
      },
      unminimize: () => {
        this.showWebamp();
      },
      restore: () => {
        this.showWebamp();
      },
      close: () => {
        appManager.closeApp(this.id);
      },
      setTitlebarIconSize: () => {},
      getTitlebarIconSize: () => 16,
      icons: this.config.icon,
      title: (t) => {
        if (t === undefined) return this.config.title;
        return shim;
      },
      setMinimizeTarget: (target) => {
        this._minimizeTarget = target;
      },
    };

    webampContainer.$window = shim;
    return shim;
  }

  async _onLaunch(filePath) {
    const handleFile = async (path) => {
      if (!path) return;

      if (path instanceof File) {
        const track = {
          metaData: {
            artist: "Unknown Artist",
            title: path.name.replace(/\.[^/.]+$/, ""),
          },
          url: URL.createObjectURL(path),
        };
        webampInstance.setTracksToPlay([track]);
        return;
      }

      if (typeof path === "string") {
        const isZenFS = isZenFSPath(path);
        const fileName = path.split("/").pop();
        if (path.toLowerCase().endsWith(".m3u")) {
          try {
            const playlistText = isZenFS
              ? await getZenFSFileAsText(path)
              : await fetch(path).then((r) => r.text());

            const trackFilenames = playlistText
              .split("\n")
              .filter((line) => line.trim() !== "" && !line.startsWith("#"));
            if (trackFilenames.length === 0) return;

            const baseUrl = path.substring(0, path.lastIndexOf("/") + 1);

            this._revokeBlobUrls();
            const tracks = await Promise.all(trackFilenames.map(async (filename) => {
              const trackUrl = baseUrl + filename;
              const title = filename
                .replace(/\.[^/.]+$/, "")
                .replace(/.* - \d{2} /, "");

              let url = trackUrl;
              if (isZenFSPath(trackUrl)) {
                url = await getZenFSFileUrl(trackUrl);
                this.blobUrls.push(url);
              }

              return {
                metaData: {
                  artist: "Unknown Artist",
                  title: title,
                },
                url: url,
              };
            }));
            webampInstance.setTracksToPlay(tracks);
          } catch (error) {
            console.error("Error loading M3U playlist:", error);
          }
        } else {
          const title = fileName.replace(/\.[^/.]+$/, "");
          let url = path;
          if (isZenFS) {
            this._revokeBlobUrls();
            url = await getZenFSFileUrl(path);
            this.blobUrls.push(url);
          }
          const track = {
            metaData: {
              artist: "Unknown Artist",
              title: title,
            },
            url: url,
          };
          webampInstance.setTracksToPlay([track]);
        }
      } else if (path && typeof path === "object") {
        // Handle virtual file object (e.g. from briefcase)
        const track = {
          metaData: {
            artist: path.artist || "Unknown Artist",
            title: path.title || path.name,
          },
          url: path.contentUrl || path.content,
        };
        webampInstance.setTracksToPlay([track]);
      }
    };

    if (webampInstance) {
      this.showWebamp();
      handleFile(filePath);
      return;
    }

    return new Promise((resolve, reject) => {
      const initialTracks = [
        {
          metaData: {
            artist: "DJ Mike Llama",
            title: "Llama Whippin' Intro",
          },
          url: "https://dn721609.ca.archive.org/0/items/llamawhippinintrobydjmikellama/demo.mp3",
        },
      ];

      import("https://unpkg.com/webamp@^2")
        .then((Webamp) => {
          const { default: WebampClass } = Webamp;

          webampInstance = new WebampClass({
            availableSkins: [
              {
                url: "https://archive.org/cors/winampskin_Expensive_Hi-Fi_1_2/ExpensiveHi-Fi.wsz",
                name: "Expensive Hi-Fi",
              },
              {
                url: "https://archive.org/cors/winampskin_Green-Dimension-V2/Green-Dimension-V2.wsz",
                name: "Green Dimension V2",
              },
              {
                url: "https://archive.org/cors/winampskin_mac_os_x_1_5-aqua/mac_os_x_1_5-aqua.wsz",
                name: "Mac OSX v1.5 (Aqua)",
              },
            ],
            initialTracks,
          });
          this.webampInstance = webampInstance;

          webampInstance.onMinimize(() => {
            if (this.win) this.win.minimize();
          });
          webampInstance.onClose(() => {
            if (this.win) this.win.close();
          });

          webampInstance
            .renderWhenReady(webampContainer)
            .then(() => {
              this.showWebamp();
              handleFile(filePath);
              resolve(); // Resolve the promise once Webamp is ready
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  showWebamp() {
    if (webampContainer) {
      webampContainer.style.display = "block";
      webampContainer.style.visibility = "visible";
    }
    this.isMinimized = false;
    this.bringToFront();
    if (this._onFocusCallback) this._onFocusCallback();
  }

  minimizeWebamp() {
    if (webampContainer) {
      webampContainer.style.display = "none";
      webampContainer.style.visibility = "hidden";
    }
    this.isMinimized = true;
    if (this._onBlurCallback) this._onBlurCallback();
  }

  bringToFront() {
    if (this.win && this.win.bringToFront) {
      this.win.bringToFront();
    }
  }

  _cleanup() {
    this._revokeBlobUrls();
    if (this._onClosedCallback) {
      this._onClosedCallback();
    }
    if (webampContainer) {
      webampContainer.remove();
      webampContainer = null;
    }

    if (webampInstance) {
      webampInstance.dispose();
      webampInstance = null;
    }
    this.isMinimized = false;
  }
}
