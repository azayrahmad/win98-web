import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import { mounts } from "@zenfs/core";
import {
  requestBusyState,
  releaseBusyState,
} from '../../../system/busy-state-manager.js';
import { getDisplayName, getParentPath } from '../navigation/path-utils.js';
import ClipboardManager from '../file-operations/clipboard-manager.js';
import { PropertiesManager } from '../file-operations/properties-manager.js';
import UndoManager from '../file-operations/undo-manager.js';
import { RemovableDiskManager } from '../drives/removable-disk-manager.js';
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';

export class MenuBarBuilder {
  constructor(app) {
    this.app = app;
  }

  build() {
    const isWeb = this.app.isWebPath(this.app.currentPath);
    try {
      if (isWeb) {
        return new window.MenuBar({
          "&File": this._getIEFileMenuItems(),
          "&Edit": this._getIEEditMenuItems(),
          "&View": this._getIEViewMenuItems(),
          "&Go": this._getIEGoMenuItems(),
          "&Help": this._getIEHelpMenuItems(),
        });
      }
      return new window.MenuBar({
        "&File": this._getFileMenuItems(),
        "&Edit": this._getEditMenuItems(),
        "&View": this._getViewMenuItems(),
        "&Go": this._getGoMenuItems(),
        "&Help": this._getHelpMenuItems(),
      });
    } catch (e) {
        console.error("Failed to build MenuBar:", e);
        return new window.MenuBar({
            "&Go": this._getGoMenuItems()
        });
    }
  }

  _getEditMenuItems() {
    const selectedIcons = this.app.iconManager?.selectedIcons || new Set();
    const selectedPaths = [...selectedIcons].map((icon) =>
      icon.getAttribute("data-path"),
    );
    const containsRootItem = selectedPaths.some(
      (p) => getParentPath(p) === "/",
    );
    const isRoot = this.app.currentPath === "/";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(this.app.currentPath);

    return [
      {
        label: UndoManager.getUndoLabel(),
        shortcutLabel: "Ctrl+Z",
        action: () => this.app.fileOps.undo(),
        enabled: () => UndoManager.canUndo(),
      },
      "MENU_DIVIDER",
      {
        label: "Cu&t",
        shortcutLabel: "Ctrl+X",
        action: () => {
          this.app.fileOps.cutItems(selectedPaths);
        },
        enabled: () => selectedPaths.length > 0 && !containsRootItem,
      },
      {
        label: "&Copy",
        shortcutLabel: "Ctrl+C",
        action: () => {
          this.app.fileOps.copyItems(selectedPaths);
        },
        enabled: () => selectedPaths.length > 0 && !isRecycleBin,
      },
      {
        label: "&Paste",
        shortcutLabel: "Ctrl+V",
        action: () => this.app.fileOps.pasteItems(this.app.currentPath),
        enabled: () => !ClipboardManager.isEmpty() && !isRoot && !isRecycleBin,
      },
      {
        label: "Paste &Shortcut",
        action: () => this.app.fileOps.pasteShortcuts(this.app.currentPath),
        enabled: () => !ClipboardManager.isEmpty() && ClipboardManager.operation === "copy" && !isRoot && !isRecycleBin,
      },
    ];
  }

  _getFileMenuItems() {
    const selectedIcons = this.app.iconManager?.selectedIcons || new Set();
    const selectedPaths = [...selectedIcons].map((icon) =>
      icon.getAttribute("data-path"),
    );
    const containsRootItem = selectedPaths.some(
      (p) => getParentPath(p) === "/",
    );
    const isRoot = this.app.currentPath === "/";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(this.app.currentPath);
    const anyRecycledItem = selectedPaths.some(p => RecycleBinManager.isRecycledItemPath(p));

    const items = [];

    if (anyRecycledItem) {
      items.push({
        label: "&Restore",
        action: () => this.app.fileOps.restoreItems(selectedPaths),
      });
    }

    if (isRecycleBin) {
      items.push({
        label: "Empty Recycle &Bin",
        action: () => this.app.fileOps.emptyRecycleBin(),
        enabled: () => RecycleBinManager.isFullSync(this.app.currentPath),
      });
    }

    if (items.length > 0) {
      items.push("MENU_DIVIDER");
    }

    const mruEntries = this.app.navHistory ? this.app.navHistory.getMRUFolders() : [];

    return [
      ...items,
      {
        label: "&Open",
        action: () => {
          const firstSelected = [...this.app.iconManager.selectedIcons][0];
          if (firstSelected) {
            const path = firstSelected.getAttribute("data-path");
            const type = firstSelected.getAttribute("data-type");
            if (type === "directory") {
              this.app.navigateTo(path);
            } else {
              this.app.openFile(firstSelected);
            }
          }
        },
        enabled: () => selectedPaths.length > 0,
        default: true,
      },
      {
        label: "&Insert Floppy",
        action: () => this.app.insertFloppy(),
        enabled: () => !mounts.has("/A:"),
      },
      {
        label: "&Eject Floppy",
        action: () => this.app.ejectFloppy(),
        enabled: () => mounts.has("/A:"),
      },
      "MENU_DIVIDER",
      {
        label: "&Insert CD",
        action: () => this.app.insertCD(),
        enabled: () => !mounts.has("/E:"),
      },
      {
        label: "&Eject CD",
        action: () => this.app.ejectCD(),
        enabled: () => mounts.has("/E:"),
      },
      {
        label: "&Insert Removable Disk",
        action: () => this.app.driveManager.insertRemovableDisk(),
        enabled: () => RemovableDiskManager.getAvailableLetter() !== null,
      },
      "MENU_DIVIDER",
      {
        label: "&New",
        enabled: () => !isRoot && !isRecycleBin,
        submenu: [
          {
            label: "&Folder",
            action: () => this.app.fileOps.createNewFolder(),
            enabled: () => !isRoot && !isRecycleBin,
          },
          {
            label: "&Text Document",
            action: () => this.app.fileOps.createNewTextFile(),
            enabled: () => !isRoot && !isRecycleBin,
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "&Delete",
        action: () => {
          this.app.fileOps.deleteItems(selectedPaths);
        },
        enabled: () => selectedPaths.length > 0 && !containsRootItem,
      },
      {
        label: "&Rename",
        action: () => {
          const firstSelected = [...this.app.iconManager.selectedIcons][0];
          if (firstSelected) {
            this.app.fileOps.renameItem(
              firstSelected.getAttribute("data-path"),
            );
          }
        },
        enabled: () =>
          selectedPaths.length === 1 && !containsRootItem && !isRecycleBin,
      },
      "MENU_DIVIDER",
      {
        radioItems: mruEntries.map((entry) => ({
          label: getDisplayName(entry.path),
          value: entry.id,
        })),
        getValue: () => {
          return this.app.navHistory ? this.app.navHistory.getSelectedMRUId() : null;
        },
        setValue: (id) => {
          const entry = this.app.navHistory.getMRUFolders().find((e) => e.id === id);
          if (entry) {
            this.app.navHistory.markAsManuallySelectedById(id);
            this.app.navigateTo(entry.path, false, true);
          }
        },
      },
      "MENU_DIVIDER",
      {
        label: "&Properties",
        action: async () => {
          const selectedIcons =
            this.app.iconManager?.selectedIcons || new Set();
          const selectedPaths = [...selectedIcons].map((icon) =>
            icon.getAttribute("data-path"),
          );
          const busyId = `properties-${Math.random()}`;
          requestBusyState(busyId, this.app.win.element);
          try {
            if (selectedPaths.length > 0) {
              await PropertiesManager.show(selectedPaths);
            } else {
              await PropertiesManager.show([this.app.currentPath]);
            }
          } finally {
            releaseBusyState(busyId, this.app.win.element);
          }
        },
      },
      "MENU_DIVIDER",
      {
        label: "&Close",
        action: () => this.app.win.close(),
      },
    ];
  }

  _getViewMenuItems() {
    return [
      {
        radioItems: [
          { label: "Large Icons", value: "large" },
          { label: "Small Icons", value: "small" },
          { label: "List", value: "list" },
          { label: "Details", value: "details" },
        ],
        getValue: () => this.app.viewMode,
        setValue: (value) => this.app.setViewMode(value),
      },
      "MENU_DIVIDER",
      {
        label: "Arrange &Icons",
        submenu: [
          { label: "by &Name", action: () => this.app.sortIcons("name") },
          { label: "by &Size", action: () => this.app.sortIcons("size") },
          { label: "by &Type", action: () => this.app.sortIcons("type") },
          { label: "by &Date", action: () => this.app.sortIcons("date") },
          "MENU_DIVIDER",
          {
            label: "&Auto Arrange",
            enabled: () =>
              this.app.viewMode === "large" || this.app.viewMode === "small",
            checkbox: {
              check: () => this.app.autoArrange,
              toggle: () => this.app.toggleAutoArrange(),
            },
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "&Refresh",
        shortcutLabel: "F5",
        action: () => this.app.navigateTo(this.app.currentPath, true, true),
      },
    ];
  }

  _getGoMenuItems() {
    return [
      {
        label: "&Back",
        action: () => this.app.goBack(),
        enabled: () => this.app.navHistory?.canGoBack(),
      },
      {
        label: "&Forward",
        action: () => this.app.goForward(),
        enabled: () => this.app.navHistory?.canGoForward(),
      },
      {
        label: "&Up One Level",
        action: () => this.app.goUp(),
        enabled: () => this.app.currentPath !== "/",
      },
    ];
  }

  _getHelpMenuItems() {
    return [
      {
        label: "&About",
        action: () => {
          ShowDialogWindow({
            title: "About ZenFS",
            text: "ZenExplorer v0.1<br>Powered by ZenFS",
            modal: true,
            buttons: [{ label: "OK" }],
          });
        },
      },
    ];
  }

  _getIEFileMenuItems() {
    return [
      {
        label: "New &Retro Window",
        action: () =>
          window.System.launchApp("explorer", "azay.rahmad"),
      },
      {
        label: "New &Live Window",
        action: () =>
          window.System.launchApp("explorer", { path: "azay.rahmad", retroMode: false }),
      },
      "MENU_DIVIDER",
      {
        label: "&Close",
        action: () => this.app.win.close(),
      },
    ];
  }

  _getIEEditMenuItems() {
    return [
      { label: "Cu&t", enabled: false },
      { label: "&Copy", enabled: false },
      { label: "&Paste", enabled: false },
    ];
  }

  _getIEViewMenuItems() {
    return [
      {
        label: "&Stop",
        action: () => {
          if (this.app.iframe && this.app.iframe.contentWindow) {
            this.app.iframe.contentWindow.stop();
          }
        },
      },
      {
        label: "&Refresh",
        shortcutLabel: "F5",
        action: () => {
          if (this.app.iframe && this.app.iframe.contentWindow) {
            this.app.iframe.contentWindow.location.reload();
          }
        },
      },
      "MENU_DIVIDER",
      {
        label: "&Retro Mode",
        checkbox: {
          check: () => this.app.retroMode,
          toggle: () => {
            this.app.retroMode = !this.app.retroMode;
            this.app.navigateTo(this.app.currentPath, true, true);
          },
        },
      },
    ];
  }

  _getIEGoMenuItems() {
    return [
      {
        label: "&Back",
        action: () => this.app.goBack(),
        enabled: () => this.app.navHistory?.canGoBack(),
      },
      {
        label: "&Forward",
        action: () => this.app.goForward(),
        enabled: () => this.app.navHistory?.canGoForward(),
      },
      {
        label: "&Up One Level",
        action: () => {
          try {
            const currentUrl = new URL(this.app.currentPath);
            const pathParts = currentUrl.pathname.split("/").filter((p) => p);
            if (pathParts.length > 0) {
              pathParts.pop();
              currentUrl.pathname = pathParts.join("/");
              this.app.navigateTo(currentUrl.toString());
            }
          } catch (e) {
            // Not a standard URL or at root
          }
        },
      },
      {
        label: "&Home Page",
        action: () => this.app.navigateTo("azay.rahmad"),
      },
    ];
  }

  _getIEHelpMenuItems() {
    return [
      {
        label: "&About Internet Explorer",
        action: () => {
          ShowDialogWindow({
            title: "About Internet Explorer",
            text: "Internet Explorer 4.0<br>Zen Edition",
            modal: true,
            buttons: [{ label: "OK" }],
          });
        },
      },
    ];
  }
}
