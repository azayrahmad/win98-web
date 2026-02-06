import { fs, mount, umount, mounts } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { Iso } from "@zenfs/archives";
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import {
  requestBusyState,
  releaseBusyState,
} from '../../../system/busy-state-manager.js';
import { FloppyManager } from './floppy-manager.js';
import { CDManager } from './cd-manager.js';
import { RemovableDiskManager } from './removable-disk-manager.js';

export class DriveManager {
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

      const busyRequesterId = "floppy-mount";
      requestBusyState(busyRequesterId, this.app.win.element);

      try {
        const floppyFs = await WebAccess.create({ handle });
        mount("/A:", floppyFs);
        FloppyManager.setLabel(handle.name);
        document.dispatchEvent(new CustomEvent("floppy-change"));
      } finally {
        releaseBusyState(busyRequesterId, this.app.win.element);
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
  async ejectFloppy() {
    if (mounts.has("/A:")) {
      const busyId = "floppy-eject";
      requestBusyState(busyId, this.app.win.element);
      try {
        umount("/A:");
        FloppyManager.clear();
        document.dispatchEvent(new CustomEvent("floppy-change"));
      } finally {
        releaseBusyState(busyId, this.app.win.element);
      }
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

      const busyRequesterId = "cd-mount";
      requestBusyState(busyRequesterId, this.app.win.element);

      try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const isoFs = await Iso.create({ data: new Uint8Array(buffer) });
        mount("/E:", isoFs);
        // Strip extension for label
        const label = file.name.replace(/\.[^/.]+$/, "");
        CDManager.setLabel(label);
        document.dispatchEvent(new CustomEvent("cd-change"));
      } finally {
        releaseBusyState(busyRequesterId, this.app.win.element);
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
  async ejectCD() {
    if (mounts.has("/E:")) {
      const busyId = "cd-eject";
      requestBusyState(busyId, this.app.win.element);
      try {
        umount("/E:");
        CDManager.clear();
        document.dispatchEvent(new CustomEvent("cd-change"));
      } finally {
        releaseBusyState(busyId, this.app.win.element);
      }
    }
  }

  /**
   * Insert Removable Disk
   */
  async insertRemovableDisk() {
    const letter = RemovableDiskManager.getAvailableLetter();
    if (!letter) {
      alert("No more drive letters available.");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker();

      const busyRequesterId = `removable-mount-${letter}`;
      requestBusyState(busyRequesterId, this.app.win.element);

      try {
        const mountPoint = `/${letter}:`;
        // Ensure directory exists in root InMemory FS
        if (!fs.existsSync(mountPoint)) {
          await fs.promises.mkdir(mountPoint);
        }

        const diskFs = await WebAccess.create({ handle });
        mount(mountPoint, diskFs);
        RemovableDiskManager.mount(letter, handle.name);
        document.dispatchEvent(new CustomEvent("removable-disk-change"));
      } finally {
        releaseBusyState(busyRequesterId, this.app.win.element);
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
      const busyId = `removable-eject-${letter}`;
      requestBusyState(busyId, this.app.win.element);
      try {
        umount(mountPoint);
        RemovableDiskManager.unmount(letter);

        try {
          if (fs.existsSync(mountPoint)) {
            await fs.promises.rmdir(mountPoint);
          }
        } catch (err) {
          console.warn(`Failed to remove mount point ${mountPoint}:`, err);
        }

        document.dispatchEvent(new CustomEvent("removable-disk-change"));
      } finally {
        releaseBusyState(busyId, this.app.win.element);
      }
    }
  }
}
