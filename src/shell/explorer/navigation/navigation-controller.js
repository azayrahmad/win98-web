import { mounts } from "@zenfs/core";
import {
  requestBusyState,
  releaseBusyState,
} from '../../../system/busy-state-manager.js';
import { NavigationHistory } from './navigation-history.js';
import {
  getParentPath,
} from './path-utils.js';
import { ShellManager } from '../extensions/shell-manager.js';

export class NavigationController {
  constructor(app) {
    this.app = app;
    this.navHistory = new NavigationHistory();
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    if (!path) return;

    const busyId = `nav-${Math.random()}`;
    requestBusyState(busyId, this.app.win.element);

    try {
      if (path === "My Computer") {
        path = "/";
      }
      if (path === "/Desktop/Internet Explorer") {
        path = "azay.rahmad";
      }

      // Normalize path for ZenFS
      let normalizedPath = path.replace(/\\/g, "/");
      if (!this.app.isWebPath(normalizedPath) && !normalizedPath.startsWith("/")) {
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

      const stats = await ShellManager.stat(normalizedPath);
      const isWeb = this.app.isWebPath(normalizedPath) && !stats.isDirectory();

      if (!stats.isDirectory() && !isWeb) {
        throw new Error("Not a directory");
      }

      this.app.isInWebMode = isWeb;

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
      this.app._updateToolbar();

      // Update UI elements
      await this.app.directoryView.updateUIForPath(normalizedPath);

      if (isWeb) {
        await this.app._loadWebUrl(normalizedPath);
      } else {
        // Read and render directory contents
        await this.app.directoryView.renderDirectoryContents(normalizedPath);
      }

      // Update cut icons
      this.app.directoryView.updateCutIcons();

      this.app.win.focus();
    } catch (err) {
      console.error("Navigation failed", err);
    } finally {
      releaseBusyState(busyId, this.app.win.element);
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
