import { fs, mounts } from "@zenfs/core";
import { NavigationHistory } from "./NavigationHistory.js";
import {
  formatPathForDisplay,
  getDisplayName,
  getParentPath,
} from "./utils/PathUtils.js";
import { ICONS } from "../../config/icons.js";
import { RecycleBinManager } from "./utils/RecycleBinManager.js";
import { ZenShellManager } from "./utils/ZenShellManager.js";

export class ZenNavigationController {
  constructor(app) {
    this.app = app;
    this.navHistory = new NavigationHistory();
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    if (!path) return;

    try {
      if (path === "My Computer") {
        path = "/";
      }

      // Normalize path for ZenFS
      let normalizedPath = path.replace(/\\/g, "/");
      if (!normalizedPath.startsWith("/")) {
        normalizedPath = "/" + normalizedPath;
      }

      // Check if floppy is mounted when accessing A:
      if (normalizedPath.startsWith("/A:") && !mounts.has("/A:")) {
        this.app.driveManager.showFloppyDialog();
        return;
      }

      // Check if CD is mounted when accessing E:
      if (normalizedPath.startsWith("/E:") && !mounts.has("/E:")) {
        this.app.driveManager.showCDDialog();
        return;
      }

      const stats = await ZenShellManager.stat(normalizedPath);

      if (!stats.isDirectory()) {
        throw new Error("Not a directory");
      }

      // Update navigation history
      if (!isHistoryNav) {
        this.navHistory.push(normalizedPath);
      }

      this.app.currentPath = normalizedPath;

      // Only add to MRU if not skipping (i.e., not from manual radio selection)
      if (!skipMRU) {
        this.navHistory.addToMRU(normalizedPath);
      }

      // Refresh menu bar
      this.app._updateMenuBar();

      // Update UI elements
      await this.app.directoryView.updateUIForPath(normalizedPath);

      // Read and render directory contents
      await this.app.directoryView.renderDirectoryContents(normalizedPath);

      // Update cut icons
      this.app.directoryView.updateCutIcons();

      this.app.win.focus();
    } catch (err) {
      console.error("Navigation failed", err);
    }
  }

  goUp() {
    if (this.app.currentPath === "/") return;
    const parentPath = getParentPath(this.app.currentPath);
    this.navigateTo(parentPath);
  }

  goBack() {
    const path = this.navHistory.goBack();
    if (path) {
      this.navigateTo(path, true);
    }
  }

  goForward() {
    const path = this.navHistory.goForward();
    if (path) {
      this.navigateTo(path, true);
    }
  }
}
