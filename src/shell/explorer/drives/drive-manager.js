import { fs, mount, umount, mounts } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { Iso } from "@zenfs/archives";
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import { kernel } from '../../../system/kernel.js';
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
      const busy = kernel.use('busy');
      busy.requestBusy(busyRequesterId, this.app.win.element);

      try {
        const floppyFs = await WebAccess.create({ handle });
        mount("/A:", floppyFs);
        FloppyManager.setLabel(handle.name);
        document.dispatchEvent(new CustomEvent("floppy-change"));
      } finally {
        busy.releaseBusy(busyRequesterId, this.app.win.element);
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
    const busyId = "floppy-eject";
    const busy = kernel.use('busy');
    busy.requestBusy(busyId, this.app.win.element);
    try {
      await kernel.use('drive').ejectDrive("A");
    } finally {
      busy.releaseBusy(busyId, this.app.win.element);
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
      const busy = kernel.use('busy');
      busy.requestBusy(busyRequesterId, this.app.win.element);

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
        busy.releaseBusy(busyRequesterId, this.app.win.element);
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
    const busyId = "cd-eject";
    const busy = kernel.use('busy');
    busy.requestBusy(busyId, this.app.win.element);
    try {
      await kernel.use('drive').ejectDrive("E");
    } finally {
      busy.releaseBusy(busyId, this.app.win.element);
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
      const busy = kernel.use('busy');
      busy.requestBusy(busyRequesterId, this.app.win.element);

      try {
        const mountPoint = `/${letter}:`;
        // Ensure directory exists in root InMemory FS
        if (!fs.existsSync(mountPoint)) {
          await fs.promises.mkdir(mountPoint);
        }

        const diskFs = await WebAccess.create({ handle });
        mount(mountPoint, diskFs);
        RemovableDiskManager.mount(letter, handle.name);
        await kernel.use('disks').saveDiskHandle(letter, handle);
        document.dispatchEvent(new CustomEvent("removable-disk-change"));
      } finally {
        busy.releaseBusy(busyRequesterId, this.app.win.element);
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
    const busyId = `removable-eject-${letter}`;
    const busy = kernel.use('busy');
    busy.requestBusy(busyId, this.app.win.element);
    try {
      await kernel.use('drive').ejectDrive(letter);
    } finally {
      busy.releaseBusy(busyId, this.app.win.element);
    }
  }
}
