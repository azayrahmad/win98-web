import { Application } from '../../system/application.js';
import {
  createTaskbarButton,
  removeTaskbarButton,
  updateTaskbarButton,
} from '../../shell/taskbar/taskbar.js';
import { ICONS } from '../../config/icons.js';
import { appManager } from '../../system/app-manager.js';
import { getWebampMenuItems } from './webamp.js';
import { isZenFSPath, getZenFSFileUrl, getZenFSFileAsText } from '../../system/zenfs-utils.js';

let webampInstance = null;
let webampContainer = null;
let webampTaskbarButton = null;
let webampTaskbarClickHandler = null;
let webampFocusHandler = null;
let webampElementMouseDownHandler = null;
let webampMenuObserver = null;
let isMinimized = false;

const focusWebampContainer = () => {
  if (!webampContainer) return;

  const zIndex = $Window.Z_INDEX++;
  webampContainer.style.zIndex = zIndex;

  const webampElement = document.getElementById("webamp");
  if (webampElement) {
    webampElement.style.zIndex = zIndex;
  }
};

const isWebampEvent = (event) => {
  const path = event?.composedPath?.() || [];

  return path.some((node) => (
    node?.id === "webamp" ||
    node?.id === "webamp-container"
  ));
};

const isWebampTaskbarEvent = (event) => {
  const path = event?.composedPath?.() || [];
  return path.includes(webampTaskbarButton);
};

const bringWebampMenusToFront = () => {
  const webampElement = document.getElementById("webamp");
  if (!webampElement) return;

  const webampZIndex = Number.parseInt(webampElement.style.zIndex || "0", 10) || 0;
  const menuZIndex = webampZIndex + 1;

  document.querySelectorAll(".webamp-context-menu").forEach((menuElement) => {
    menuElement.style.zIndex = String(menuZIndex);
  });
};

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

  _centerWebampContainer() {
    if (!webampContainer) return;

    const webampElement = webampContainer.querySelector("#webamp") || webampContainer;
    const { width, height } = webampElement.getBoundingClientRect();

    webampContainer.style.left = `${Math.max(0, Math.round((window.innerWidth - width) / 2))}px`;
    webampContainer.style.top = `${Math.max(0, Math.round((window.innerHeight - height) / 2))}px`;
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
      focusWebampContainer();
      document.body.appendChild(webampContainer);

      webampContainer.addEventListener(
        "mousedown",
        focusWebampContainer,
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
              this._centerWebampContainer();
              this.setupTaskbarButton();
              this._setupFocusTracking();
              this._setupWebampElementFocus();
              this._setupWebampMenuLayering();
              this.showWebamp();
              handleFile(filePath);
              resolve(); // Resolve the promise once Webamp is ready
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  _setupFocusTracking() {
    if (webampFocusHandler) return;

    webampFocusHandler = (event) => {
      if (isMinimized) return;

      if (isWebampEvent(event)) {
        focusWebampContainer();
        if (webampTaskbarButton) {
          updateTaskbarButton("webamp", true, false);
        }
        return;
      }

      if (isWebampTaskbarEvent(event)) {
        return;
      }

      if (webampTaskbarButton) {
        updateTaskbarButton("webamp", false, false);
      }
    };

    document.addEventListener("mousedown", webampFocusHandler, true);
  }

  _setupWebampElementFocus() {
    const webampElement = document.getElementById("webamp");
    if (!webampElement || webampElementMouseDownHandler) return;

    webampElementMouseDownHandler = () => {
      if (isMinimized) return;

      focusWebampContainer();
      if (webampTaskbarButton) {
        updateTaskbarButton("webamp", true, false);
      }
    };

    webampElement.addEventListener("mousedown", webampElementMouseDownHandler, true);
  }

  _setupWebampMenuLayering() {
    if (webampMenuObserver) return;

    webampMenuObserver = new MutationObserver((mutations) => {
      const hasMenuMutation = mutations.some((mutation) => (
        [...mutation.addedNodes].some((node) => (
          node instanceof Element && (
            node.matches?.(".webamp-context-menu") ||
            node.querySelector?.(".webamp-context-menu")
          )
        ))
      ));

      if (!hasMenuMutation) return;

      requestAnimationFrame(() => {
        bringWebampMenusToFront();
      });
    });

    webampMenuObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupTaskbarButton() {
    const taskbarButtonId = "webamp";
    webampTaskbarButton = createTaskbarButton(
      taskbarButtonId,
      ICONS.webamp,
      "Winamp",
    );

    if (webampTaskbarButton) {
      webampTaskbarClickHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (isMinimized) {
          this.showWebamp();
        } else {
          this.minimizeWebamp();
        }
      };

      webampTaskbarButton.addEventListener("click", webampTaskbarClickHandler, true);
    }
  }

  showWebamp() {
    if (!webampContainer) return;

    const webampElement = document.getElementById("webamp");

    webampContainer.style.display = "block";
    webampContainer.style.visibility = "visible";
    if (webampElement) {
      webampElement.style.display = "block";
      webampElement.style.visibility = "visible";
    }
    isMinimized = false;
    focusWebampContainer();
    if (webampTaskbarButton) {
      updateTaskbarButton("webamp", true, false);
    }

    bringWebampMenusToFront();
  }

  minimizeWebamp() {
    if (!webampContainer) return;

    const webampElement = document.getElementById("webamp");

    webampContainer.style.display = "none";
    webampContainer.style.visibility = "hidden";
    if (webampElement) {
      webampElement.style.display = "none";
      webampElement.style.visibility = "hidden";
    }
    isMinimized = true;
    if (webampTaskbarButton) {
      updateTaskbarButton("webamp", false, true);
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

    if (webampTaskbarButton && webampTaskbarClickHandler) {
      webampTaskbarButton.removeEventListener("click", webampTaskbarClickHandler, true);
      webampTaskbarClickHandler = null;
    }

    if (webampTaskbarButton) {
      removeTaskbarButton("webamp");
      webampTaskbarButton = null;
    }

    if (webampFocusHandler) {
      document.removeEventListener("mousedown", webampFocusHandler, true);
      webampFocusHandler = null;
    }

    const webampElement = document.getElementById("webamp");
    if (webampElement && webampElementMouseDownHandler) {
      webampElement.removeEventListener("mousedown", webampElementMouseDownHandler, true);
    }
    webampElementMouseDownHandler = null;

    if (webampMenuObserver) {
      webampMenuObserver.disconnect();
      webampMenuObserver = null;
    }

    isMinimized = false;
  }
}
