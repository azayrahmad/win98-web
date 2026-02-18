import { fs, umount, mounts } from "@zenfs/core";
import { RemovableDiskManager } from "../shell/explorer/drives/removable-disk-manager.js";
import { FloppyManager } from "../shell/explorer/drives/floppy-manager.js";
import { CDManager } from "../shell/explorer/drives/cd-manager.js";
import { removeDiskHandle } from "./removable-disk-persistence.js";
import { ShowDialogWindow } from "../shared/components/dialog-window.js";

/**
 * DriveService - Centralized service for drive management and error handling
 */
export const DriveService = {
  /**
   * Ejects a drive by letter
   * @param {string} letter
   */
  async ejectDrive(letter) {
    const upperLetter = letter.toUpperCase();
    const mountPoint = `/${upperLetter}:`;

    if (mounts.has(mountPoint)) {
      try {
        umount(mountPoint);
      } catch (e) {
        console.warn(`Failed to unmount ${mountPoint}:`, e);
      }
    }

    // Clear managers
    if (upperLetter === "A") {
      FloppyManager.clear();
      document.dispatchEvent(new CustomEvent("floppy-change"));
    } else if (upperLetter === "E") {
      CDManager.clear();
      document.dispatchEvent(new CustomEvent("cd-change"));
    } else {
      RemovableDiskManager.unmount(upperLetter);
      await removeDiskHandle(upperLetter);
      document.dispatchEvent(new CustomEvent("removable-disk-change"));
    }

    // Remove mount point directory from root FS
    try {
      if (fs.existsSync(mountPoint)) {
        await fs.promises.rmdir(mountPoint);
      }
    } catch (err) {
      console.warn(`Failed to remove mount point ${mountPoint}:`, err);
    }
  },

  /**
   * Checks if a drive is still accessible
   * @param {string} letter
   * @returns {Promise<boolean>}
   */
  async isDriveAccessible(letter) {
    const mountPoint = `/${letter.toUpperCase()}:`;
    try {
      // Attempt to read the root of the drive
      await fs.promises.readdir(mountPoint);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Notifies the user and ejects the drive
   * @param {string} letter
   */
  async notifyAndEject(letter) {
    const upperLetter = letter.toUpperCase();

    ShowDialogWindow({
      title: `Drive ${upperLetter}:`,
      text: `The drive ${upperLetter}: is no longer accessible and has been automatically ejected.`,
      buttons: [{ label: "OK", isDefault: true }],
      soundEvent: "SystemHand",
    });

    await this.ejectDrive(upperLetter);
  },

  /**
   * Handles a filesystem error, checking if it was caused by an inaccessible drive
   * @param {string} path
   * @param {Error} error
   */
  async handleDriveError(path, error) {
    const driveMatch = path.match(/^\/([A-Z]):/i);
    if (!driveMatch) return;

    const letter = driveMatch[1].toUpperCase();

    // We only auto-eject removable drives (A:, E:, and others except C:)
    if (letter === "C") return;

    // Check if it's currently mounted according to our managers
    const isMounted = letter === "A" || letter === "E" || RemovableDiskManager.isMounted(letter);
    if (!isMounted) return;

    // Verify accessibility
    const accessible = await this.isDriveAccessible(letter);
    if (!accessible) {
      console.warn(`Drive ${letter}: is inaccessible. Triggering auto-eject.`);
      await this.notifyAndEject(letter);
    }
  }
};
