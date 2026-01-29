import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { mounts } from "@zenfs/core";
import { getDisplayName, getParentPath } from "./utils/PathUtils.js";
import ZenClipboardManager from "./utils/ZenClipboardManager.js";
import { PropertiesManager } from "./utils/PropertiesManager.js";
import ZenUndoManager from "./utils/ZenUndoManager.js";
import { ZenRemovableDiskManager } from "./utils/ZenRemovableDiskManager.js";

/**
 * MenuBarBuilder - Constructs menu bar for ZenExplorer
 */

export class MenuBarBuilder {
  constructor(app) {
    this.app = app;
  }

  /**
   * Build complete menu bar
   * @returns {MenuBar} Menu bar instance
   */
  build() {
    return new window.MenuBar({
      "&File": this._getFileMenuItems(),
      "&Edit": this._getEditMenuItems(),
      "&View": this._getViewMenuItems(),
      "&Go": this._getGoMenuItems(),
      "&Help": this._getHelpMenuItems(),
    });
  }

  /**
   * Get Edit menu items
   * @private
   */
  _getEditMenuItems() {
    const selectedIcons = this.app.iconManager?.selectedIcons || new Set();
    const selectedPaths = [...selectedIcons].map((icon) =>
      icon.getAttribute("data-path"),
    );
    const containsRootItem = selectedPaths.some(
      (p) => getParentPath(p) === "/",
    );
    const isRoot = this.app.currentPath === "/";

    return [
      {
        label: ZenUndoManager.getUndoLabel(),
        shortcutLabel: "Ctrl+Z",
        action: () => this.app.fileOps.undo(),
        enabled: () => ZenUndoManager.canUndo(),
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
        enabled: () => selectedPaths.length > 0,
      },
      {
        label: "&Paste",
        shortcutLabel: "Ctrl+V",
        action: () => this.app.fileOps.pasteItems(this.app.currentPath),
        enabled: () => !ZenClipboardManager.isEmpty() && !isRoot,
      },
    ];
  }

  /**
   * Get File menu items
   * @private
   */
  _getFileMenuItems() {
    const selectedIcons = this.app.iconManager?.selectedIcons || new Set();
    const selectedPaths = [...selectedIcons].map((icon) =>
      icon.getAttribute("data-path"),
    );
    const containsRootItem = selectedPaths.some(
      (p) => getParentPath(p) === "/",
    );
    const isRoot = this.app.currentPath === "/";

    return [
      {
        label: "&Open",
        action: () => {
                    const selectedPaths = [...this.app.iconManager.selectedIcons]
                        .map(icon => icon.getAttribute("data-path"));
                    const firstSelected = [...this.app.iconManager.selectedIcons][0];
                    if (firstSelected) {
                        const type = firstSelected.getAttribute("data-type");
                        if (type === "directory") {
                            this.app.navigateTo(selectedPaths[0]);
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
        enabled: () => ZenRemovableDiskManager.getAvailableLetter() !== null,
      },
      "MENU_DIVIDER",
      {
        label: "&New",
        enabled: () => !isRoot,
        submenu: [
          {
            label: "&Folder",
            action: () => this.app.fileOps.createNewFolder(),
            enabled: () => !isRoot,
          },
          {
                        label: "&Text Document",
                        action: () => this.app.fileOps.createNewTextFile(),
            
            enabled: () => !isRoot,
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
        enabled: () => selectedPaths.length === 1 && !containsRootItem,
      },
      "MENU_DIVIDER",
      {
        radioItems: this.app.navHistory.getMRUFolders().map((entry) => ({
          label: getDisplayName(entry.path),
          value: entry.id, // Use unique ID as value instead of path
        })),
        getValue: () => {
          // Return the ID of the selected entry
          return this.app.navHistory.getSelectedMRUId();
        },
        setValue: (id) => {
          // Find the entry by ID
          const entry = this.app.navHistory
            .getMRUFolders()
            .find((e) => e.id === id);
          if (entry) {
            // Mark this specific entry as manually selected
            this.app.navHistory.markAsManuallySelectedById(id);
            // Navigate without adding to MRU (pass true for skipMRU)
            this.app.navigateTo(entry.path, false, true);
          }
        },
      },
      "MENU_DIVIDER",
      {
        label: "&Properties",
        action: () => {
          const selectedIcons = this.app.iconManager?.selectedIcons || new Set();
          const selectedPaths = [...selectedIcons].map((icon) =>
            icon.getAttribute("data-path"),
          );
          if (selectedPaths.length > 0) {
            PropertiesManager.show(selectedPaths);
          } else {
            PropertiesManager.show([this.app.currentPath]);
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

  /**
   * Get View menu items
   * @private
   */
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
        label: "&Refresh",
        shortcutLabel: "F5",
        action: () => this.app.navigateTo(this.app.currentPath, true, true),
      },
    ];
  }

  /**
   * Get Go menu items
   * @private
   */
  _getGoMenuItems() {
    return [
      {
        label: "&Back",
        action: () => this.app.goBack(),
        enabled: () => this.app.navHistory.canGoBack(),
      },
      {
        label: "&Forward",
        action: () => this.app.goForward(),
        enabled: () => this.app.navHistory.canGoForward(),
      },
      {
        label: "&Up One Level",
        action: () => this.app.goUp(),
        enabled: () => this.app.currentPath !== "/",
      },
    ];
  }

  /**
   * Get Help menu items
   * @private
   */
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
}
