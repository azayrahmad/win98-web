import { mounts } from "@zenfs/core";
import {
  requestBusyState,
  releaseBusyState,
} from "../../../utils/busyStateManager.js";
import { RecycleBinManager } from "../fileoperations/RecycleBinManager.js";
import { PropertiesManager } from "../fileoperations/PropertiesManager.js";
import { RemovableDiskManager } from "../drives/RemovableDiskManager.js";
import { getParentPath, getPathName } from "../navigation/PathUtils.js";
import ClipboardManager from "../fileoperations/ClipboardManager.js";
import { ShellManager } from "../extensions/ShellManager.js";
import { ShowDialogWindow } from "../../../components/DialogWindow.js";
import { playSound } from "../../../utils/soundManager.js";

export class ContextMenuBuilder {
  constructor(app) {
    this.app = app;
  }

  buildItemMenu(e, icon) {
    const path = icon.getAttribute("data-path");
    const type = icon.getAttribute("data-type");
    const selectedIcons = [...this.app.iconManager.selectedIcons];
    const selectedPaths = selectedIcons.map((i) =>
      i.getAttribute("data-path"),
    );
    const isRootItem = selectedPaths.some((p) => getParentPath(p) === "/");
    const anyVirtual = selectedIcons.some(i => i.getAttribute("data-is-virtual") === "true");
    const isOnReadOnlyDrive = selectedPaths.some(p => p.startsWith("/E:"));
    const isFloppy = path === "/A:";
    const isFloppyMounted = mounts.has("/A:");
    const isCD = path === "/E:";
    const isCDMounted = mounts.has("/E:");
    const driveLetterMatch = path.match(/^\/([A-Z]):$/);
    const driveLetter = driveLetterMatch ? driveLetterMatch[1].toUpperCase() : null;
    const isRemovableDiskMounted = driveLetter && RemovableDiskManager.isMounted(driveLetter);
    const isRecycledItem = RecycleBinManager.isRecycledItemPath(path);
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);

    let menuItems = [];

    if (isRecycleBin && selectedPaths.length === 1) {
      menuItems = [
        {
          label: "Open",
          action: () => this.app.navigateTo(path),
          default: true,
        },
        {
          label: "Empty Recycle Bin",
          action: () => this.app.fileOps.emptyRecycleBin(path),
        },
        "MENU_DIVIDER",
        {
          label: "Properties",
          action: async () => {
            const busyId = `properties-${Math.random()}`;
            requestBusyState(busyId, this.app.win.element);
            try {
              await PropertiesManager.show(selectedPaths);
            } finally {
              releaseBusyState(busyId, this.app.win.element);
            }
          },
        },
      ];
      return menuItems;
    }

    if (isRecycledItem) {
      menuItems = [
        {
          label: "Restore",
          action: () => this.app.fileOps.restoreItems(selectedPaths),
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
          action: async () => {
            const busyId = `properties-${Math.random()}`;
            requestBusyState(busyId, this.app.win.element);
            try {
              await PropertiesManager.show(selectedPaths);
            } finally {
              releaseBusyState(busyId, this.app.win.element);
            }
          },
        },
      ];
    } else {
      menuItems = [
        {
          label: "Open",
          action: async () => {
            const handled = await ShellManager.onOpen(path, this.app);
            if (handled) return;

            if (type === "directory") {
              this.app.navigateTo(path);
            } else {
              this.app.openFile(icon);
            }
          },
          default: true,
        },
      ];

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
          enabled: () => !isRootItem && !isRecycleBin && !anyVirtual,
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
            !ClipboardManager.isEmpty() && type === "directory",
        },
        "MENU_DIVIDER",
        {
          label: "Delete",
          action: () => this.app.fileOps.deleteItems(selectedPaths),
          enabled: () => !isRootItem && !isRecycleBin && !isOnReadOnlyDrive && !anyVirtual,
        },
        {
          label: "Rename",
          action: () => this.app.fileOps.renameItem(path),
          enabled: () =>
            !isRootItem && selectedPaths.length === 1 && !isRecycleBin && !anyVirtual,
        },
        "MENU_DIVIDER",
        {
          label: "Properties",
          action: async () => {
            const busyId = `properties-${Math.random()}`;
            requestBusyState(busyId, this.app.win.element);
            try {
              await PropertiesManager.show(selectedPaths);
            } finally {
              releaseBusyState(busyId, this.app.win.element);
            }
          },
        },
      );
    }
    return menuItems;
  }

  buildBackgroundMenu(e) {
    const isRoot = this.app.currentPath === "/";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(this.app.currentPath);

    if (isRecycleBin) {
      return [
        {
          label: "Empty Recycle Bin",
          action: () => this.app.fileOps.emptyRecycleBin(this.app.currentPath),
        },
        "MENU_DIVIDER",
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
          label: "Properties",
          action: async () => {
            const busyId = `properties-${Math.random()}`;
            requestBusyState(busyId, this.app.win.element);
            try {
              await PropertiesManager.show([this.app.currentPath]);
            } finally {
              releaseBusyState(busyId, this.app.win.element);
            }
          },
        },
      ];
    }

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
        label: "Paste",
        action: () => this.app.fileOps.pasteItems(this.app.currentPath),
        enabled: () => !ClipboardManager.isEmpty() && !isRoot,
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
        action: async () => {
          const busyId = `properties-${Math.random()}`;
          requestBusyState(busyId, this.app.win.element);
          try {
            await PropertiesManager.show([this.app.currentPath]);
          } finally {
            releaseBusyState(busyId, this.app.win.element);
          }
        },
      },
    ];
    return menuItems;
  }
}
