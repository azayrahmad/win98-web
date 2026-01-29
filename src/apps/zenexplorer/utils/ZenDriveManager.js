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
import { FAT } from "./ZenFatFS.js";

export class ZenDriveManager {
  constructor(app) {
    this.app = app;
    this._floppyWriteTimeout = null;
    this._currentFloppyHandle = null;
    this._currentFloppyData = null;
  }

  /**
   * Flush pending floppy writes immediately
   */
  async flushFloppy() {
    if (this._floppyWriteTimeout) {
      clearTimeout(this._floppyWriteTimeout);
      this._floppyWriteTimeout = null;
    }

    if (this._currentFloppyHandle && this._currentFloppyData) {
      try {
        const writable = await this._currentFloppyHandle.createWritable();
        await writable.write(this._currentFloppyData);
        await writable.close();
        console.log("Floppy disk image flushed successfully.");
      } catch (err) {
        console.error("Failed to flush floppy:", err);
      }
    }
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
          label: "Insert Image",
          action: (win) => this.insertFloppy(win),
        },
        {
          label: "Create Blank",
          action: (win) => {
            win.close();
            this.createBlankFloppy();
          },
        },
        { label: "Cancel" },
      ],
    });
  }

  /**
   * Persist floppy data to local file
   */
  async _persistFloppy(handle, data) {
    this._currentFloppyHandle = handle;
    this._currentFloppyData = data;

    if (this._floppyWriteTimeout) {
      clearTimeout(this._floppyWriteTimeout);
    }
    this._floppyWriteTimeout = setTimeout(async () => {
      await this.flushFloppy();
    }, 1000); // 1 second debounce
  }

  /**
   * Insert floppy image
   */
  async insertFloppy(dialogWin) {
    await this.flushFloppy();
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Floppy Disk Images",
            accept: {
              "application/octet-stream": [".img", ".ima"],
            },
          },
        ],
      });

      // Close dialog immediately after selection
      if (dialogWin) dialogWin.close();

      const busyRequesterId = "zen-floppy-mount";
      requestWaitState(busyRequesterId, this.app.win.element);

      try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        this._currentFloppyHandle = handle;
        this._currentFloppyData = data;

        const floppyFs = await FAT.create({
          data,
          onWrite: () => this._persistFloppy(handle, data),
        });

        if (mounts.has("/A:")) {
          umount("/A:");
        }

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
   * Create a blank floppy disk image
   */
  async createBlankFloppy() {
    await this.flushFloppy();
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "FLOPPY.img",
        types: [
          {
            description: "Floppy Disk Images",
            accept: {
              "application/octet-stream": [".img", ".ima"],
            },
          },
        ],
      });

      const busyRequesterId = "zen-floppy-create";
      requestWaitState(busyRequesterId, this.app.win.element);

      try {
        // Standard 1.44MB size
        const data = new Uint8Array(1440 * 1024);
        this._currentFloppyHandle = handle;
        this._currentFloppyData = data;

        // Format and create FS
        const floppyFs = await FAT.createAndFormat({
          data,
          onWrite: () => this._persistFloppy(handle, data),
        });

        // Write initial blank image to file
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();

        if (mounts.has("/A:")) {
          umount("/A:");
        }

        mount("/A:", floppyFs);
        ZenFloppyManager.setLabel(handle.name);
        document.dispatchEvent(new CustomEvent("zen-floppy-change"));
      } finally {
        releaseWaitState(busyRequesterId, this.app.win.element);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Failed to create floppy:", err);
      }
    }
  }

  /**
   * Eject floppy
   */
  async ejectFloppy() {
    await this.flushFloppy();
    if (mounts.has("/A:")) {
      umount("/A:");
      ZenFloppyManager.clear();
      this._currentFloppyHandle = null;
      this._currentFloppyData = null;
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
