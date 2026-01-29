import { fs, mount, umount, mounts } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { Iso } from "@zenfs/archives";
import { ShowDialogWindow } from "../../../components/DialogWindow.js";
import {
  requestWaitState,
  releaseWaitState,
} from "../../../utils/busyStateManager.js";
import { ZenFloppyManager } from "./ZenFloppyManager.js";
import { ZenCDManager } from "./ZenCDManager.js";
import { ZenRemovableDiskManager } from "./ZenRemovableDiskManager.js";

export class ZenDriveManager {
  constructor(app) {
    this.app = app;
  }

  /**
   * Show dialog for unmounted floppy
   */
  showFloppyDialog() {
    ShowDialogWindow({
      title: "3½ Floppy (A:)",
      text: "Insert floppy disk into drive A:\\",
      buttons: [
        {
          label: "OK",
          action: (win) => this.insertFloppy(win),
        },
        { label: "Cancel" },
      ],
    });
  }

  /**
   * Insert floppy using WebAccess
   */
  async insertFloppy(dialogWin) {
    try {
      const handle = await window.showDirectoryPicker();

      // Close dialog immediately after selection
      if (dialogWin) dialogWin.close();

      const busyRequesterId = "zen-floppy-mount";
      requestWaitState(busyRequesterId, this.app.win.element);

      try {
        const floppyFs = await WebAccess.create({ handle });
        mount("/A:", floppyFs);
        ZenFloppyManager.setLabel(handle.name);
        document.dispatchEvent(new CustomEvent("zen-floppy-change"));
      } finally {
        releaseWaitState(busyRequesterId, this.app.win.element);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Failed to mount floppy:", err);
      }
    }
  }

  /**
   * Eject floppy
   */
  ejectFloppy() {
    if (mounts.has("/A:")) {
      umount("/A:");
      ZenFloppyManager.clear();
      document.dispatchEvent(new CustomEvent("zen-floppy-change"));
    }
  }

  /**
   * Show dialog for unmounted CD
   */
  showCDDialog() {
    ShowDialogWindow({
      title: "CD-ROM (E:)",
      text: "Please insert a disc into drive E:\\",
      buttons: [
        {
          label: "OK",
          action: (win) => this.insertCD(win),
        },
        { label: "Cancel" },
      ],
    });
  }

  /**
   * Insert CD (ISO)
   */
  async insertCD(dialogWin) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "ISO Images",
            accept: {
              "application/x-iso9660-image": [".iso"],
            },
          },
        ],
      });

      // Close dialog immediately after selection
      if (dialogWin) dialogWin.close();

      const busyRequesterId = "zen-cd-mount";
      requestWaitState(busyRequesterId, this.app.win.element);

      try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const isoFs = await Iso.create({ data: new Uint8Array(buffer) });
        mount("/E:", isoFs);
        // Strip extension for label
        const label = file.name.replace(/\.[^/.]+$/, "");
        ZenCDManager.setLabel(label);
        document.dispatchEvent(new CustomEvent("zen-cd-change"));
      } finally {
        releaseWaitState(busyRequesterId, this.app.win.element);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Failed to mount CD:", err);
      }
    }
  }

  /**
   * Eject CD
   */
  ejectCD() {
    if (mounts.has("/E:")) {
      umount("/E:");
      ZenCDManager.clear();
      document.dispatchEvent(new CustomEvent("zen-cd-change"));
    }
  }

  /**
   * Insert Removable Disk
   */
  async insertRemovableDisk() {
    const letter = ZenRemovableDiskManager.getAvailableLetter();
    if (!letter) {
      alert("No more drive letters available.");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();

      const busyRequesterId = `zen-removable-mount-${letter}`;
      requestWaitState(busyRequesterId, this.app.win.element);

      try {
        const mountPoint = `/${letter}:`;
        // Ensure directory exists in root InMemory FS
        if (!fs.existsSync(mountPoint)) {
          await fs.promises.mkdir(mountPoint);
        }

        const diskFs = await WebAccess.create({ handle });
        mount(mountPoint, diskFs);
        ZenRemovableDiskManager.mount(letter, handle.name);
        document.dispatchEvent(new CustomEvent("zen-removable-disk-change"));
      } finally {
        releaseWaitState(busyRequesterId, this.app.win.element);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Failed to mount removable disk:", err);
      }
    }
  }

  /**
   * Eject Removable Disk
   */
  async ejectRemovableDisk(letter) {
    const mountPoint = `/${letter}:`;
    if (mounts.has(mountPoint)) {
      umount(mountPoint);
      ZenRemovableDiskManager.unmount(letter);

      try {
        if (fs.existsSync(mountPoint)) {
          await fs.promises.rmdir(mountPoint);
        }
      } catch (err) {
        console.warn(`Failed to remove mount point ${mountPoint}:`, err);
      }

      document.dispatchEvent(new CustomEvent("zen-removable-disk-change"));
    }
  }
}
