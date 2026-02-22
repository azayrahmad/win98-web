import { BaseProcess } from "../../system/base-process.js";
import {
  createTaskbarButton,
  removeTaskbarButton,
  updateTaskbarButton,
} from "../../shell/taskbar/taskbar.js";
import { ICONS } from "../../config/icons.js";
import { getWebampMenuItems } from "./webamp.js";
import {
  isZenFSPath,
  getZenFSFileUrl,
  getZenFSFileAsText,
  getZenFSFileAsBlob,
} from "../../system/zenfs-utils.js";
import * as musicMetadata from "music-metadata-browser";
import { getVolume, getMuted } from "../../system/sound-manager.js";

let webampInstance = null;
let webampContainer = null;
let webampTaskbarButton = null;
let isMinimized = false;

export class WebampApp extends BaseProcess {
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

  constructor(config, services) {
    super(config, services);
    this.hasTaskbarButton = true;
    this.blobUrls = [];
  }

  _revokeBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }


  async getTrackMetadata(source, isZenFS = false) {
    try {
      let blob;
      if (source instanceof Blob) {
        blob = source;
      } else if (source instanceof Uint8Array) {
        blob = new Blob([source]);
      } else if (isZenFS) {
        blob = await getZenFSFileAsBlob(source);
      } else if (typeof source === "string") {
        const response = await fetch(source);
        blob = await response.blob();
      } else {
        return null;
      }
      const metadata = await musicMetadata.parseBlob(blob);
      return {
        title: metadata.common.title,
        artist: metadata.common.artist,
      };
    } catch (error) {
      console.error("Error extracting metadata:", error);
      return null;
    }
  }

  async _onLaunch(filePath) {
    const handleFile = async (path) => {
      if (!path) return;

      if (path instanceof File) {
        const fileMeta = await this.getTrackMetadata(path);
        const track = {
          metaData: {
            artist: fileMeta?.artist || "Unknown Artist",
            title: fileMeta?.title || path.name.replace(/\.[^/.]+$/, ""),
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

            const lines = playlistText.split("\n");
            const baseUrl = path.substring(0, path.lastIndexOf("/") + 1);
            this._revokeBlobUrls();

            const tracks = [];
            let currentMetadata = null;

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine === "" || trimmedLine === "#EXTM3U") continue;

              if (trimmedLine.startsWith("#EXTINF:")) {
                const commaIndex = trimmedLine.indexOf(",");
                if (commaIndex !== -1) {
                  const info = trimmedLine.substring(commaIndex + 1);
                  const dashIndex = info.indexOf(" - ");
                  if (dashIndex !== -1) {
                    currentMetadata = {
                      artist: info.substring(0, dashIndex).trim(),
                      title: info.substring(dashIndex + 3).trim(),
                    };
                  } else {
                    currentMetadata = {
                      artist: "Unknown Artist",
                      title: info.trim(),
                    };
                  }
                }
              } else if (!trimmedLine.startsWith("#")) {
                const trackUrl =
                  trimmedLine.startsWith("http") || trimmedLine.startsWith("/")
                    ? trimmedLine
                    : baseUrl + trimmedLine;
                const isTrackZenFS = isZenFSPath(trackUrl);
                let url = trackUrl;
                if (isTrackZenFS) {
                  url = await getZenFSFileUrl(trackUrl);
                  this.blobUrls.push(url);
                }

                let metaData = currentMetadata;
                if (!metaData) {
                  const fileMeta = await this.getTrackMetadata(
                    trackUrl,
                    isTrackZenFS,
                  );
                  metaData = {
                    artist: fileMeta?.artist || "Unknown Artist",
                    title:
                      fileMeta?.title ||
                      trimmedLine
                        .split("/")
                        .pop()
                        .replace(/\.[^/.]+$/, ""),
                  };
                }

                tracks.push({ metaData, url });
                currentMetadata = null;
              }
            }

            if (tracks.length > 0) {
              webampInstance.setTracksToPlay(tracks);
            }
          } catch (error) {
            console.error("Error loading M3U playlist:", error);
          }
        } else {
          const fileMeta = await this.getTrackMetadata(path, isZenFS);
          const title = fileMeta?.title || fileName.replace(/\.[^/.]+$/, "");
          const artist = fileMeta?.artist || "Unknown Artist";
          let url = path;
          if (isZenFS) {
            this._revokeBlobUrls();
            url = await getZenFSFileUrl(path);
            this.blobUrls.push(url);
          }
          const track = {
            metaData: {
              artist: artist,
              title: title,
            },
            url: url,
          };
          webampInstance.setTracksToPlay([track]);
        }
      } else if (path && typeof path === "object" && !(path instanceof File)) {
        // Handle virtual file object (e.g. from briefcase)
        let metaData = {
          artist: path.artist || "Unknown Artist",
          title: path.title || path.name,
        };

        if (
          (!path.artist || !path.title) &&
          (path.content || path.contentUrl)
        ) {
          const source = path.content || path.contentUrl;
          const fileMeta = await this.getTrackMetadata(source);
          if (fileMeta) {
            metaData.artist =
              path.artist || fileMeta.artist || "Unknown Artist";
            metaData.title = path.title || fileMeta.title || path.name;
          }
        }

        const track = {
          metaData,
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
          webampInstance.onClose(() => this.services.appManager.closeApp(this.id));

          webampInstance
            .renderWhenReady(webampContainer)
            .then(() => {
              this.setupTaskbarButton();
              this.showWebamp();
              handleFile(filePath);

              const updateVolume = () => {
                if (!webampInstance) return;
                const systemVolume = getVolume();
                const systemMuted = getMuted();
                // Webamp volume is 0-255
                const webampVol = systemMuted
                  ? 0
                  : Math.round(systemVolume * 255);
                webampInstance.store.dispatch({
                  type: "SET_VOLUME",
                  volume: webampVol,
                });
              };

              document.addEventListener("system-volume-change", updateVolume);
              updateVolume();

              // Also listen to webamp volume changes to sync back to system?
              // webampInstance.onVolumeChange(...) might exist but let's stick to system override for now.

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
