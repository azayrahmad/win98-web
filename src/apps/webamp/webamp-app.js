import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { getWebampMenuItems } from './webamp.js';
import { isZenFSPath, getZenFSFileUrl, getZenFSFileAsText } from '../../system/zenfs-utils.js';
import './webamp.css';

export class WebampApp extends Application {
  static config = {
    id: "webamp",
    title: "Winamp",
    description: "A classic music player.",
    icon: ICONS.webamp, category: "",
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
    this.webampContainer = null;
  }

  _getWindowId(filePath) {
    return "webamp-app-window";
  }

  _revokeBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  _createWindow() {
    const win = new $Window({
      id: "webamp-app-window",
      title: this.title,
      icons: this.icon,
      resizable: false,
      maximizable: false,
      width: 275,
      height: 116,
    });
    win.element.classList.add("webamp-window");

    // Disable window animations for Webamp
    win.animateTitlebar = (from, to, callback) => {
      if (callback) callback();
    };

    return win;
  }

  _onLaunch(filePath) {
    this._doLaunch(filePath);
  }

  async _doLaunch(filePath) {
    const handleFile = async (path) => {
      if (!path) return;
      if (!this.webampInstance) return;

      if (path instanceof File) {
        const track = {
          metaData: {
            artist: "Unknown Artist",
            title: path.name.replace(/\.[^/.]+$/, ""),
          },
          url: URL.createObjectURL(path),
        };
        this.webampInstance.setTracksToPlay([track]);
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
            this.webampInstance.setTracksToPlay(tracks);
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
          this.webampInstance.setTracksToPlay([track]);
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
        this.webampInstance.setTracksToPlay([track]);
      }
    };

    if (this.webampInstance) {
      this.showWebamp();
      handleFile(filePath);
      return;
    }

    try {
      // Create container in body initially, then move it to the window
      // Webamp sometimes has issues rendering directly into deeply nested elements
      const container = document.createElement("div");
      container.id = "webamp-container";
      document.body.appendChild(container);
      this.webampContainer = container;

      // Ensure no stale webamp nodes exist before rendering
      const staleWebamp = document.getElementById("webamp");
      if (staleWebamp) staleWebamp.remove();

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

          this.webampInstance = new WebampClass({
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

          this.webampInstance.onMinimize(() => this.win.minimize());
          this.webampInstance.onClose(() => this.win.close());

          this.webampInstance
            .renderWhenReady(this.webampContainer)
            .then(() => {
              // Move the entire container into our window
              this.win.$content.append(this.webampContainer);

              // Reset container positioning to be relative to the window content area
              this.webampContainer.style.position = "absolute";
              this.webampContainer.style.left = "0";
              this.webampContainer.style.top = "0";

              // Ensure Webamp root is inside the container
              const webampNode = document.getElementById("webamp");
              if (webampNode && webampNode.parentElement !== this.webampContainer) {
                this.webampContainer.appendChild(webampNode);
              }

              // Webamp windows (Main, EQ, PL) are absolutely positioned.
              // When reparented, we want them to be at 0,0 relative to our window content area.
              const resetWebampPositions = () => {
                const windows = ["#main-window", "#equalizer-window", "#playlist-window"];
                windows.forEach(selector => {
                  const el = document.querySelector(selector);
                  if (el) {
                    el.style.left = "0px";
                    el.style.top = "0px";
                  }
                });
              };
              resetWebampPositions();

              // Sync focus state
              this.win.onFocus(() => {
                const webampNode = document.getElementById("webamp");
                if (webampNode) webampNode.classList.remove("webamp-inactive");
              });
              this.win.onBlur(() => {
                const webampNode = document.getElementById("webamp");
                if (webampNode) webampNode.classList.add("webamp-inactive");
              });

              // Initial focus state
              const webampNodeInitial = document.getElementById("webamp");
              if (webampNodeInitial) {
                if (this.win.element.classList.contains("focused")) {
                  webampNodeInitial.classList.remove("webamp-inactive");
                } else {
                  webampNodeInitial.classList.add("webamp-inactive");
                }
              }

              // Support Shade Mode and Resizing of the system window to match Webamp
              const updateWindowSize = () => {
                const mainWin = document.getElementById("main-window");
                if (mainWin) {
                  const isShade = mainWin.classList.contains("shade");
                  this.win.setDimensions({
                    outerWidth: 275,
                    outerHeight: isShade ? 14 : 116
                  });
                }
              };

              const mainWin = document.getElementById("main-window");
              if (mainWin) {
                this.shadeObserver = new MutationObserver(updateWindowSize);
                this.shadeObserver.observe(mainWin, { attributes: true, attributeFilter: ["class"] });
                updateWindowSize();
              }

              this.showWebamp();
              handleFile(filePath);
            })
            .catch(err => console.error("WebampApp: render error", err));
        })
        .catch(err => console.error("WebampApp: import error", err));
    } catch (err) {
      console.error("WebampApp: launch error", err);
    }
  }

  showWebamp() {
    if (this.win) {
      this.win.unminimize();
      this.win.focus();
    }
  }

  minimizeWebamp() {
    if (this.win) {
      this.win.minimize();
    }
  }

  close() {
    if (this.win) {
      this.win.close();
    }
  }

  _cleanup() {
    this._revokeBlobUrls();
    this.webampContainer = null;

    if (this.shadeObserver) {
      this.shadeObserver.disconnect();
      this.shadeObserver = null;
    }

    if (this.webampInstance) {
      this.webampInstance.dispose();
      this.webampInstance = null;
    }
  }
}
