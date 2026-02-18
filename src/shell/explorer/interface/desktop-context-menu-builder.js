import { ContextMenuBuilder } from "./context-menu-builder.js";
import {
  getThemes,
  getCurrentTheme,
  setTheme,
} from "../../../system/theme-manager.js";
import {
  setColorMode,
  getCurrentColorMode,
  getColorModes,
} from "../../../system/color-mode-manager.js";
import screensaver from "../../../system/screensaver-utils.js";
import {
  getAvailableResolutions,
  setResolution,
  getCurrentResolutionId,
} from "../../../system/screen-manager.js";
import {
  getItem,
  setItem,
  removeItem,
  LOCAL_STORAGE_KEYS,
} from "../../../system/local-storage.js";
import { launchApp } from "../../../system/app-manager.js";
import ClipboardManager from "../file-operations/clipboard-manager.js";
import { launchDisplayPropertiesApp } from "../../display-properties/index.js";

export class DesktopContextMenuBuilder extends ContextMenuBuilder {
  buildBackgroundMenu(e) {
    const themes = getThemes();

    const setWallpaper = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
            const dataUrl = readerEvent.target.result;
            setItem(LOCAL_STORAGE_KEYS.WALLPAPER, dataUrl);
            document.dispatchEvent(new CustomEvent("wallpaper-changed"));
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const removeWallpaper = () => {
      removeItem(LOCAL_STORAGE_KEYS.WALLPAPER);
      document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    };

    const getWallpaperMode = () =>
      getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "tile";
    const setWallpaperMode = (mode) => {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, mode);
      document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    };

    const getMonitorType = () =>
      getItem(LOCAL_STORAGE_KEYS.MONITOR_TYPE) || "TFT";
    const setMonitorType = (type) => {
      setItem(LOCAL_STORAGE_KEYS.MONITOR_TYPE, type);
      if (type === "CRT") {
        document.body.classList.add("scanlines");
      } else {
        document.body.classList.remove("scanlines");
      }
    };

    const menuItems = [
      {
        label: "Arrange Icons",
        submenu: [
          { label: "by Name", action: () => this.app.sortIcons("name") },
          { label: "by Size", action: () => this.app.sortIcons("size") },
          { label: "by Type", action: () => this.app.sortIcons("type") },
          { label: "by Date", action: () => this.app.sortIcons("date") },
          "MENU_DIVIDER",
          {
            label: "Auto Arrange",
            checkbox: {
              check: () => this.app.autoArrange,
              toggle: () => this.app.toggleAutoArrange(),
            },
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Paste",
        action: () => this.app.fileOps.pasteItems(this.app.currentPath),
        enabled: () => !ClipboardManager.isEmpty(),
      },
      {
        label: "Paste Shortcut",
        action: () => this.app.fileOps.pasteShortcuts(this.app.currentPath),
        enabled: () =>
          !ClipboardManager.isEmpty() && ClipboardManager.operation === "copy",
      },
      "MENU_DIVIDER",
      {
        label: "New",
        submenu: [
          {
            label: "Folder",
            action: () => this.app.fileOps.createNewFolder(),
          },
          {
            label: "Text Document",
            action: () => this.app.fileOps.createNewTextFile(),
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Wallpaper",
        submenu: [
          {
            label: "Set Wallpaper...",
            action: setWallpaper,
          },
          {
            label: "Remove Wallpaper",
            action: removeWallpaper,
          },
          "MENU_DIVIDER",
          {
            radioItems: [
              { label: "Center", value: "center" },
              { label: "Tile", value: "tile" },
              { label: "Stretch", value: "stretch" },
            ],
            getValue: () => getWallpaperMode(),
            setValue: (value) => setWallpaperMode(value),
            ariaLabel: "Wallpaper Mode",
          },
        ],
      },
      {
        label: "Color Mode",
        submenu: [
          {
            radioItems: Object.entries(getColorModes()).map(([id, mode]) => ({
              label: mode.name,
              value: id,
            })),
            getValue: () => getCurrentColorMode(),
            setValue: (value) => setColorMode(value),
            ariaLabel: "Color Mode",
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Theme",
        submenu: [
          {
            radioItems: Object.values(themes).map((theme) => ({
              label: theme.name,
              value: theme.id,
            })),
            getValue: () => getCurrentTheme(),
            setValue: (value) => {
              setTheme(value);
            },
            ariaLabel: "Desktop Theme",
          },
        ],
      },
      {
        label: "Monitor Type",
        submenu: [
          {
            radioItems: [
              { label: "TFT", value: "TFT" },
              { label: "CRT", value: "CRT" },
            ],
            getValue: () => getMonitorType(),
            setValue: (value) => setMonitorType(value),
            ariaLabel: "Monitor Type",
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Screen Resolution",
        submenu: [
          {
            radioItems: getAvailableResolutions().map((res) => ({
              label: res === "fit" ? "Fit Screen" : res,
              value: res,
            })),
            getValue: () => getCurrentResolutionId(),
            setValue: (value) => setResolution(value),
            ariaLabel: "Screen Resolution",
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Screen Saver",
        submenu: [
          {
            radioItems: [
              { label: "None", value: "none" },
              { label: "FlowerBox", value: "flowerbox" },
              { label: "3D Maze", value: "maze" },
            ],
            getValue: () => screensaver.getCurrentScreensaver(),
            setValue: (value) => {
              screensaver.setCurrentScreensaver(value);
            },
            ariaLabel: "Select Screensaver",
          },
          "MENU_DIVIDER",
          {
            label: "Wait Time",
            submenu: [
              {
                radioItems: [
                  { label: "1 minute", value: 60000 },
                  { label: "5 minutes", value: 300000 },
                  { label: "30 minutes", value: 1800000 },
                  { label: "1 hour", value: 3600000 },
                ],
                getValue: () =>
                  getItem(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT) || 300000,
                setValue: (value) => {
                  setItem(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT, value);
                },
                ariaLabel: "Screen Saver Wait Time",
              },
            ],
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Properties",
        action: () => launchDisplayPropertiesApp(),
      },
    ];

    return menuItems;
  }
}
