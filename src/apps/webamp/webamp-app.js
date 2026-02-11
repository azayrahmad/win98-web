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

  _revokeBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  _createWindow() {
    const win = new $Window({
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

  async _onLaunch(filePath) {
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

    return new Promise((resolve, reject) => {
      this.webampContainer = this.win.$content[0];
      this.webampContainer.id = "webamp-container";

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
              this.showWebamp();
              handleFile(filePath);
              resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
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

    if (this.webampInstance) {
      this.webampInstance.dispose();
      this.webampInstance = null;
    }
  }
}
