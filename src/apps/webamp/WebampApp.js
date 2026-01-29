import { Application } from "../Application.js";
import {
  createTaskbarButton,
  removeTaskbarButton,
  updateTaskbarButton,
} from "../../components/taskbar.js";
import { ICONS } from "../../config/icons.js";
import { appManager } from "../../utils/appManager.js";
import { getWebampMenuItems } from "./webamp.js";
import { isZenFSPath, getZenFSFileUrl, getZenFSFileAsText } from "../../utils/zenfs-utils.js";

let webampInstance = null;
let webampContainer = null;
let webampTaskbarButton = null;
let isMinimized = false;

export class WebampApp extends Application {
  static config = {
    id: "webamp",
    title: "Winamp",
    description: "A classic music player.",
    icon: ICONS.webamp,
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
  }

  _revokeBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  _createWindow() {
    // Webamp doesn't use a standard OS-GUI window, it renders directly to the body.
    // We manage its container and lifecycle here.
    return null; // Return null to prevent default window creation.
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
      webampContainer = document.createElement("div");
      webampContainer.id = "webamp-container";
      webampContainer.style.position = "absolute";
      webampContainer.style.zIndex = $Window.Z_INDEX++;
      webampContainer.style.left = "50px";
      webampContainer.style.top = "50px";
      document.body.appendChild(webampContainer);

      webampContainer.addEventListener(
        "mousedown",
        () => {
          webampContainer.style.zIndex = $Window.Z_INDEX++;
        },
        true,
      );

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

          webampInstance.onMinimize(() => this.minimizeWebamp());
          webampInstance.onClose(() => appManager.closeApp(this.id));

          webampInstance
            .renderWhenReady(webampContainer)
            .then(() => {
              this.setupTaskbarButton();
              this.showWebamp();
              handleFile(filePath);
              resolve(); // Resolve the promise once Webamp is ready
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  setupTaskbarButton() {
    const taskbarButtonId = "webamp-taskbar-button";
    webampTaskbarButton = createTaskbarButton(
      taskbarButtonId,
      ICONS.webamp,
      "Winamp",
    );

    if (webampTaskbarButton) {
      webampTaskbarButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isMinimized) {
          this.showWebamp();
        } else {
          this.minimizeWebamp();
        }
      });
    }
  }

  showWebamp() {
    const webampElement = document.getElementById("webamp");
    if (!webampElement) return;

    webampElement.style.display = "block";
    webampElement.style.visibility = "visible";
    isMinimized = false;
    webampContainer.style.zIndex = $Window.Z_INDEX++;
    if (webampTaskbarButton) {
      updateTaskbarButton("webamp-taskbar-button", true, false);
    }
  }

  minimizeWebamp() {
    const webampElement = document.getElementById("webamp");
    if (!webampElement) return;

    webampElement.style.display = "none";
    webampElement.style.visibility = "hidden";
    isMinimized = true;
    if (webampTaskbarButton) {
      updateTaskbarButton("webamp-taskbar-button", false, true);
    }
  }

  _cleanup() {
    this._revokeBlobUrls();
    if (webampContainer) {
      webampContainer.remove();
      webampContainer = null;
    }

    if (webampInstance) {
      webampInstance.dispose();
      webampInstance = null;
    }

    if (webampTaskbarButton) {
      removeTaskbarButton("webamp-taskbar-button");
      webampTaskbarButton = null;
    }
    isMinimized = false;
  }
}
