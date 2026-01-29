import { mounts } from "@zenfs/core";
import { RecycleBinManager } from "./RecycleBinManager.js";
import { PropertiesManager } from "./PropertiesManager.js";
import { ZenRemovableDiskManager } from "./ZenRemovableDiskManager.js";
import { getParentPath, getPathName } from "./PathUtils.js";
import ZenClipboardManager from "./ZenClipboardManager.js";
import { ShowDialogWindow } from "../../../components/DialogWindow.js";
import { playSound } from "../../../utils/soundManager.js";

export class ZenContextMenuBuilder {
  constructor(app) {
    this.app = app;
  }

  buildItemMenu(e, icon) {
    const path = icon.getAttribute("data-path");
    const type = icon.getAttribute("data-type");
    const selectedPaths = [...this.app.iconManager.selectedIcons].map((i) =>
      i.getAttribute("data-path"),
    );
    const isRootItem = selectedPaths.some((p) => getParentPath(p) === "/");
    const isFloppy = path === "/A:";
    const isFloppyMounted = mounts.has("/A:");
    const isCD = path === "/E:";
    const isCDMounted = mounts.has("/E:");
    const driveLetterMatch = path.match(/^\/([A-Z]):$/i);
    const driveLetter = driveLetterMatch ? driveLetterMatch[1].toUpperCase() : null;
    const isRemovableDiskMounted = driveLetter && ZenRemovableDiskManager.isMounted(driveLetter);
    const isRecycledItem = RecycleBinManager.isRecycledItemPath(path);
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);

    let menuItems = [];

    if (isRecycledItem) {
      menuItems = [
        {
          label: "Restore",
          action: () => {
            const ids = selectedPaths.map((p) => getPathName(p));
            RecycleBinManager.restoreItems(ids);
          },
          default: true,
        },
        "MENU_DIVIDER",
        {
          label: "Delete",
          action: () => this.app.fileOps.deleteItems(selectedPaths, true),
        },
        "MENU_DIVIDER",
        {
          label: "Properties",
          action: () => PropertiesManager.show(selectedPaths),
        },
      ];
    } else {
      menuItems = [
        {
          label: "Open",
          action: () => {
            if (type === "directory") {
              this.app.navigateTo(path);
            } else {
              this.app.openFile(icon);
            }
          },
          default: true,
        },
      ];

      if (isRecycleBin) {
        menuItems.push({
          label: "Empty Recycle Bin",
          action: async () => {
            const isEmpty = await RecycleBinManager.isEmpty();
            if (isEmpty) return;

            ShowDialogWindow({
              title: "Confirm Empty Recycle Bin",
              text: "Are you sure you want to permanently delete all items in the Recycle Bin?",
              buttons: [
                {
                  label: "Yes",
                  isDefault: true,
                  action: async () => {
                    await RecycleBinManager.emptyRecycleBin();
                    playSound("EmptyRecycleBin");
                    if (this.app.currentPath === path) {
                      this.app.navigateTo(path, true, true);
                    }
                  },
                },
                { label: "No" },
              ],
            });
          },
        });
      }

      if (isFloppy) {
        if (isFloppyMounted) {
          menuItems.push({
            label: "Eject",
            action: () => this.app.driveManager.ejectFloppy(),
          });
        } else {
          menuItems.push({
            label: "Insert",
            action: () => this.app.driveManager.insertFloppy(),
          });
        }
      }

      if (isCD) {
        if (isCDMounted) {
          menuItems.push({
            label: "Eject",
            action: () => this.app.driveManager.ejectCD(),
          });
        } else {
          menuItems.push({
            label: "Insert",
            action: () => this.app.driveManager.insertCD(),
          });
        }
      }

      if (isRemovableDiskMounted) {
        menuItems.push({
          label: "Eject",
          action: () => this.app.driveManager.ejectRemovableDisk(driveLetter),
        });
      }

      menuItems.push(
        "MENU_DIVIDER",
        {
          label: "Cut",
          action: () => this.app.fileOps.cutItems(selectedPaths),
          enabled: () => !isRootItem && !isRecycleBin,
        },
        {
          label: "Copy",
          action: () => this.app.fileOps.copyItems(selectedPaths),
          enabled: () => !isRecycleBin,
        },
        {
          label: "Paste",
          action: () => this.app.fileOps.pasteItems(path),
          enabled: () =>
            !ZenClipboardManager.isEmpty() && type === "directory",
        },
        "MENU_DIVIDER",
        {
          label: "Delete",
          action: () => this.app.fileOps.deleteItems(selectedPaths),
          enabled: () => !isRootItem && !isRecycleBin,
        },
        {
          label: "Rename",
          action: () => this.app.fileOps.renameItem(path),
          enabled: () =>
            !isRootItem && selectedPaths.length === 1 && !isRecycleBin,
        },
        "MENU_DIVIDER",
        {
          label: "Properties",
          action: () => PropertiesManager.show(selectedPaths),
        },
      );
    }
    return menuItems;
  }

  buildBackgroundMenu(e) {
    const isRoot = this.app.currentPath === "/";
    const menuItems = [
      {
        label: "View",
        submenu: [
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
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Paste",
        action: () => this.app.fileOps.pasteItems(this.app.currentPath),
        enabled: () => !ZenClipboardManager.isEmpty() && !isRoot,
      },
      "MENU_DIVIDER",
      {
        label: "New",
        enabled: () => !isRoot,
        submenu: [
          {
            label: "Folder",
            action: () => this.app.fileOps.createNewFolder(),
            enabled: () => !isRoot,
          },
          {
            label: "Text Document",
            action: () => this.app.fileOps.createNewTextFile(),
          },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Properties",
        action: () => PropertiesManager.show([this.app.currentPath]),
      },
    ];
    return menuItems;
  }
}
