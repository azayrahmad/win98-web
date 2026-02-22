import { ContextMenuBuilder } from "./context-menu-builder.js";
import {
  LOCAL_STORAGE_KEYS,
} from "../../../system/local-storage.js";
import { kernel } from "../../../system/kernel.js";
import { launchDisplayPropertiesApp } from "../../display-properties/index.js";

export class DesktopContextMenuBuilder extends ContextMenuBuilder {
  buildBackgroundMenu(e) {
    const themeService = kernel.use('theme');
    const settings = kernel.use('settings');
    const displayService = kernel.use('display');
    const screensaver = kernel.use('screensaver');
    const clipboard = kernel.use('clipboard');
    const themes = themeService.getThemes();

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
            settings.set(LOCAL_STORAGE_KEYS.WALLPAPER, dataUrl);
            document.dispatchEvent(new CustomEvent("wallpaper-changed"));
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const removeWallpaper = () => {
      settings.remove(LOCAL_STORAGE_KEYS.WALLPAPER);
      document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    };

    const getWallpaperMode = () =>
      settings.get(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "tile";
    const setWallpaperMode = (mode) => {
      settings.set(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, mode);
      document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    };

    const getMonitorType = () =>
      settings.get(LOCAL_STORAGE_KEYS.MONITOR_TYPE) || "TFT";
    const setMonitorType = (type) => {
      settings.set(LOCAL_STORAGE_KEYS.MONITOR_TYPE, type);
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
        enabled: () => !clipboard.isEmpty(),
      },
      {
        label: "Paste Shortcut",
        action: () => this.app.fileOps.pasteShortcuts(this.app.currentPath),
        enabled: () =>
          !clipboard.isEmpty() && clipboard.get().operation === "copy",
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
            radioItems: Object.entries(displayService.getColorModes()).map(([id, mode]) => ({
              label: mode.name,
              value: id,
            })),
            getValue: () => displayService.getCurrentColorMode(),
            setValue: (value) => displayService.setColorMode(value),
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
            getValue: () => themeService.getActiveThemeId(),
            setValue: (value) => {
              themeService.setTheme(value);
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
            radioItems: displayService.getAvailableResolutions().map((res) => ({
              label: res === "fit" ? "Fit Screen" : res,
              value: res,
            })),
            getValue: () => displayService.getCurrentResolutionId(),
            setValue: (value) => displayService.setResolution(value),
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
                  settings.get(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT) || 300000,
                setValue: (value) => {
                  settings.set(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT, value);
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
