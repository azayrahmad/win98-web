import { Application } from "../Application.js";
import { mounts } from "@zenfs/core";
import { initFileSystem } from "../../utils/zenfs-init.js";
import { ICONS } from "../../config/icons.js";
import { getAssociation } from "../../utils/directory.js";
import { launchApp } from "../../utils/appManager.js";
import { IconManager } from "../../components/IconManager.js";
import { AddressBar } from "../../components/AddressBar.js";
import { StatusBar } from "../../components/StatusBar.js";
import "../explorer/explorer.css"; // Reuse explorer styles

// Extracted modules
import { ZenSidebar } from "./components/ZenSidebar.js";
import { FileOperations } from "./FileOperations.js";
import { MenuBarBuilder } from "./MenuBarBuilder.js";
import { ZenNavigationController } from "./ZenNavigationController.js";
import { ZenDirectoryView } from "./components/ZenDirectoryView.js";
import { ZenDriveManager } from "./utils/ZenDriveManager.js";
import { ZenContextMenuBuilder } from "./utils/ZenContextMenuBuilder.js";
import { ZenKeyboardHandler } from "./utils/ZenKeyboardHandler.js";
import { RecycleBinManager } from "./utils/RecycleBinManager.js";
import { PropertiesManager } from "./utils/PropertiesManager.js";

export class ZenExplorerApp extends Application {
  static config = {
    id: "zenexplorer",
    title: "File Manager (ZenFS)",
    description: "Browse files using ZenFS.",
    icon: ICONS.computer,
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.currentPath = "/";
    this.viewMode = "large";
    this.fileOps = new FileOperations(this);
    this.navController = new ZenNavigationController(this);
    this.navHistory = this.navController.navHistory; // Proxy for MenuBarBuilder
    this.directoryView = new ZenDirectoryView(this);
    this.driveManager = new ZenDriveManager(this);
    this.contextMenuBuilder = new ZenContextMenuBuilder(this);
    this.keyboardHandler = new ZenKeyboardHandler(this);
  }

  async _createWindow(initialPath) {
    if (initialPath) {
      this.currentPath = initialPath;
    }

    // 1. Initialize File System
    await initFileSystem();
    await RecycleBinManager.init();

    // 2. Setup Window
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      minimizeButton: this.minimizeButton,
      maximizeButton: this.maximizeButton,
      id: this.id,
    });
    this.win = win;

    // 2a. Setup MenuBar
    this._updateMenuBar();

    // 3. Toolbar / Address Bar
    this.addressBar = new AddressBar({
      onEnter: (path) => this.navigateTo(path),
    });
    win.$content.append(this.addressBar.element);

    // 4. Main Content Area (Split View)
    const content = document.createElement("div");
    content.className = "explorer-content sunken-panel";
    content.style.height = "calc(100% - 60px)"; // Adjust for bars
    this.content = content;

    // 4a. Sidebar
    this.sidebar = new ZenSidebar();
    content.appendChild(this.sidebar.element);

    // 4b. Icon View
    this.iconContainer = document.createElement("div");
    this.iconContainer.className = `explorer-icon-view ${this.viewMode}-icons`;
    content.appendChild(this.iconContainer);

    win.$content.append(content);

    // 4c. Resize Observer for responsive layout
    this._setupResizeObserver();

    // 5. Status Bar
    this.statusBar = new StatusBar();
    win.$content.append(this.statusBar.element);

    // 6. Icon Manager
    this._setupIconManager();

    // 7. Event Delegation for Navigation
    this._setupEventListeners();

    // 7a. Clipboard listener
    this._setupClipboardListener();

    // 7b. Floppy listener
    this._setupFloppyListener();

    // 7c. CD listener
    this._setupCDListener();

    // 7d. Recycle Bin listener
    this._setupRecycleBinListener();

    // 7d. Undo listener
    this._setupUndoListener();

    // 7e. Removable Disk listener
    this._setupRemovableDiskListener();

    // 8. Initial Navigation
    this.navigateTo(this.currentPath);

    return win;
  }

  /**
   * Setup resize observer for responsive layout
   * @private
   */
  _setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width <= 400) {
          this.content.classList.add("small-width");
          this.content.classList.remove("with-sidebar");
        } else {
          this.content.classList.remove("small-width");
          this.content.classList.add("with-sidebar");
        }
      }
    });
    this.resizeObserver.observe(this.content);
  }

  /**
   * Setup icon manager with event handlers
   * @private
   */
  _setupIconManager() {
    this.iconManager = new IconManager(this.iconContainer, {
      iconSelector: ".explorer-icon",
      onItemContext: (e, icon) => {
        const menuItems = this.contextMenuBuilder.buildItemMenu(e, icon);
        new window.ContextMenu(menuItems, e);
      },
      onBackgroundContext: (e) => {
        const menuItems = this.contextMenuBuilder.buildBackgroundMenu(e);
        new window.ContextMenu(menuItems, e);
      },
      onSelectionChange: () => {
        const selectedIcons = this.iconManager.selectedIcons;
        const count = selectedIcons.size;
        this.statusBar.setText(`${count} object(s) selected`);

        this.directoryView.handleSelectionChange();

        if (this.menuBar) {
          this._updateMenuBar();
        }
      },
    });
  }

  /**
   * Setup event listeners for navigation
   * @private
   */
  _setupEventListeners() {
    this.iconContainer.addEventListener("dblclick", (e) => {
      const icon = e.target.closest(".explorer-icon");
      if (icon) {
        const path = icon.getAttribute("data-path");
        const type = icon.getAttribute("data-type");

        if (RecycleBinManager.isRecycledItemPath(path)) {
          PropertiesManager.show([path]);
          return;
        }

        if (type === "directory") {
          this.navigateTo(path);
        } else {
          this.openFile(icon);
        }
      }
    });

    // Keyboard shortcuts
    this.win.element.addEventListener("keydown", (e) =>
      this.keyboardHandler.handleKeyDown(e),
    );
  }

  /**
   * Open a file using its association
   * @param {HTMLElement} icon - The icon element of the file
   */
  openFile(icon) {
    const name = icon.getAttribute("data-name");
    const fullPath = icon.getAttribute("data-path");
    const association = getAssociation(name);
    if (association.appId) {
      launchApp(association.appId, fullPath);
    } else {
      alert(`Cannot open file: ${name} (No association)`);
    }
  }

  /**
   * Setup Undo listener
   * @private
   */
  _setupUndoListener() {
    this._undoHandler = () => {
      if (this.menuBar) {
        this.menuBar.element.dispatchEvent(new Event("update"));
      }
    };
    document.addEventListener("zen-undo-change", this._undoHandler);
  }

  /**
   * Setup clipboard listener
   * @private
   */
  _setupClipboardListener() {
    this._clipboardHandler = () => {
      this.directoryView.updateCutIcons();
      if (this.menuBar) {
        this.menuBar.element.dispatchEvent(new Event("update"));
      }
    };
    document.addEventListener("zen-clipboard-change", this._clipboardHandler);
  }

  /**
   * Setup Recycle Bin listener
   * @private
   */
  _setupRecycleBinListener() {
    this._recycleBinHandler = () => {
      this.navigateTo(this.currentPath, true, true);
    };
    document.addEventListener(
      "zen-recycle-bin-change",
      this._recycleBinHandler,
    );
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    return this.navController.navigateTo(path, isHistoryNav, skipMRU);
  }

  enterRenameMode(icon) {
    return this.directoryView.enterRenameMode(icon);
  }

  enterRenameModeByPath(path) {
    return this.directoryView.enterRenameModeByPath(path);
  }

  goUp() {
    return this.navController.goUp();
  }

  goBack() {
    return this.navController.goBack();
  }

  goForward() {
    return this.navController.goForward();
  }

  /**
   * Set the view mode (large, small, list, details)
   * @param {string} mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
    if (this.iconContainer) {
      this.iconContainer.className = `explorer-icon-view ${mode}-icons`;
    }
    this.directoryView.renderDirectoryContents(this.currentPath);
    this._updateMenuBar();
  }

  insertFloppy() {
    return this.driveManager.insertFloppy();
  }

  ejectFloppy() {
    return this.driveManager.ejectFloppy();
  }

  insertCD() {
    return this.driveManager.insertCD();
  }

  ejectCD() {
    return this.driveManager.ejectCD();
  }

  _updateMenuBar() {
    if (!this.win) return;
    const menuBuilder = new MenuBarBuilder(this);
    this.menuBar = menuBuilder.build();
    this.win.setMenuBar(this.menuBar);
  }

  /**
   * Setup floppy change listener
   * @private
   */
  _setupFloppyListener() {
    this._floppyHandler = () => {
      if (this.currentPath.startsWith("/A:") && !mounts.has("/A:")) {
        this.navigateTo("/");
      } else {
        this.navigateTo(this.currentPath, true, true);
      }
    };
    document.addEventListener("zen-floppy-change", this._floppyHandler);
  }

  /**
   * Setup CD change listener
   * @private
   */
  _setupCDListener() {
    this._cdHandler = () => {
      if (this.currentPath.startsWith("/E:") && !mounts.has("/E:")) {
        this.navigateTo("/");
      } else {
        this.navigateTo(this.currentPath, true, true);
      }
    };
    document.addEventListener("zen-cd-change", this._cdHandler);
  }

  /**
   * Setup Removable Disk change listener
   * @private
   */
  _setupRemovableDiskListener() {
    this._removableDiskHandler = () => {
      const driveMatch = this.currentPath.match(/^\/([A-Z]:)/);
      if (driveMatch && !mounts.has(driveMatch[0])) {
        this.navigateTo("/");
      } else {
        this.navigateTo(this.currentPath, true, true);
      }
    };
    document.addEventListener(
      "zen-removable-disk-change",
      this._removableDiskHandler,
    );
  }

  _onClose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this._clipboardHandler) {
      document.removeEventListener(
        "zen-clipboard-change",
        this._clipboardHandler,
      );
    }
    if (this._floppyHandler) {
      document.removeEventListener("zen-floppy-change", this._floppyHandler);
    }
    if (this._cdHandler) {
      document.removeEventListener("zen-cd-change", this._cdHandler);
    }
    if (this._removableDiskHandler) {
      document.removeEventListener(
        "zen-removable-disk-change",
        this._removableDiskHandler,
      );
    }
    if (this._recycleBinHandler) {
      document.removeEventListener(
        "zen-recycle-bin-change",
        this._recycleBinHandler,
      );
    }
    if (this._undoHandler) {
      document.removeEventListener("zen-undo-change", this._undoHandler);
    }
  }
}
