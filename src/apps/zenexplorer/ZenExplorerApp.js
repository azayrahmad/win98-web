import { Application, openApps } from "../Application.js";
import { mounts, mount, umount } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { initFileSystem } from "../../utils/zenfs-init.js";
import { getItem, LOCAL_STORAGE_KEYS } from "../../utils/localStorage.js";
import { getHandle } from "../../utils/handle-persistence.js";
import { ICONS } from "../../config/icons.js";
import { getAssociation } from "../../utils/directory.js";
import { launchApp } from "../../utils/appManager.js";
import { IconManager } from "../../components/IconManager.js";
import { AddressBar } from "../../components/AddressBar.js";
import { StatusBar } from "../../components/StatusBar.js";
import { AnimatedLogo } from "../../components/AnimatedLogo.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import browseUiIcons from "../../assets/icons/browse-ui-icons.png";
import browseUiIconsGrayscale from "../../assets/icons/browse-ui-icons-grayscale.png";
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
import ZenDragDropManager from "./utils/ZenDragDropManager.js";
import ZenLayoutManager from "./utils/ZenLayoutManager.js";
import { ZenShellManager } from "./utils/ZenShellManager.js";
import { joinPath } from "./utils/PathUtils.js";
import { getToolbarItems } from "./utils/ZenToolbarBuilder.js";
import { sortFileInfos } from "./utils/ZenSortUtils.js";
import { ControlPanelExtension } from "./shell/ControlPanelExtension.js";

// Initialize Shell Extensions
ZenShellManager.registerExtension(new ControlPanelExtension());

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

  async launch(data = null) {
    const targetPath = this._normalizePath(data);
    let existingAppAtSamePath = null;
    let anyZenExplorer = false;

    for (const app of openApps.values()) {
      if (app.config?.id === this.id) {
        anyZenExplorer = true;
        if (this._normalizePath(app.currentPath) === targetPath) {
          existingAppAtSamePath = app;
          break;
        }
      }
    }

    if (existingAppAtSamePath) {
      if (existingAppAtSamePath.win) {
        existingAppAtSamePath.win.focus();
      }
      return;
    }

    // If we have any existing ZenExplorer, we need a unique windowId
    // to bypass the singleton-like check in Application.launch.
    if (anyZenExplorer) {
      const filePath =
        typeof data === "string"
          ? data
          : data?.file || data?.filePath || data?.path || "/";

      // If data was already an object with windowId, respect it
      if (data && typeof data === "object" && data.windowId) {
        return super.launch(data);
      }

      return super.launch({
        file: filePath,
        windowId: `${this.id}-${Date.now()}-${Math.random()}`,
      });
    }

    // First instance: use default launch behavior (maintains #zenexplorer ID if launched without path)
    return super.launch(data);
  }

  _normalizePath(path) {
    let p = "/";
    if (typeof path === "string") {
      p = path;
    } else if (path && typeof path === "object") {
      p = path.file || path.filePath || path.path || "/";
    }

    if (typeof p !== "string") p = "/";

    p = p.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
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

    // 3. Toolbar
    const toolbarItems = getToolbarItems(this);
    this.toolbar = new window.Toolbar(toolbarItems, {
      icons: browseUiIcons,
      iconsGrayscale: browseUiIconsGrayscale,
    });
    win.$content.append(this.toolbar.element);

    // 3a. Address Bar
    this.addressBar = new AddressBar({
      onEnter: (path) => this.navigateTo(path),
    });
    win.$content.append(this.addressBar.element);

    // 4. Main Content Area (Split View)
    win.$content.css({
      display: "flex",
      flexDirection: "column",
      height: "100%",
    });

    const content = document.createElement("div");
    content.className = "explorer-content sunken-panel";
    content.style.flexGrow = "1";
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

    // 7f. FS change listener
    this._setupFSListener();

    // 7g. Layout change listener
    this._setupLayoutListener();

    // 8. Initial Navigation
    this.navigateTo(this.currentPath);

    // 9. Check for local drive unlock
    this._checkAndPromptForLocalCDrive();

    return win;
  }

  /**
   * Check if C: drive is set to local storage and needs to be unlocked
   * @private
   */
  async _checkAndPromptForLocalCDrive() {
    const storageType = getItem(LOCAL_STORAGE_KEYS.C_DRIVE_STORAGE_TYPE);
    if (storageType !== 'local') return;

    const handle = await getHandle('c-drive');
    if (!handle) return;

    // If permission is already granted, zenfs-init.js should have mounted it.
    // However, it might still return 'prompt' on the first check after reload.
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') return;

    ShowDialogWindow({
      title: "Unlock C: Drive",
      text: "Your C: drive is configured to use a local folder. Please click Unlock to grant access to your files.",
      buttons: [
        {
          label: "Unlock",
          isDefault: true,
          action: async (dialog) => {
            try {
              const newPermission = await handle.requestPermission({ mode: 'readwrite' });
              if (newPermission === 'granted') {
                const localFs = await WebAccess.create({ handle });
                if (mounts.has("/C:")) umount("/C:");
                mount("/C:", localFs);

                dialog.close();

                // Refresh all ZenExplorer instances and Desktop
                document.dispatchEvent(new CustomEvent("zen-fs-change"));
                document.dispatchEvent(new CustomEvent("desktop-refresh"));

                // Refresh current app view
                this.navigateTo(this.currentPath, true, true);
              }
            } catch (e) {
              console.error("Failed to unlock C: drive:", e);
              alert("Failed to unlock C: drive: " + e.message);
            }
          }
        },
        { label: "Cancel" }
      ],
      modal: true,
      parentWindow: this.win
    });
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
      onDragStart: (e, icon, selectedIcons) => {
        ZenDragDropManager.startDrag(selectedIcons, this, e.clientX, e.clientY);
      },
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
        this._updateToolbar();
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
  async openFile(icon) {
    const name = icon.getAttribute("data-name");
    const fullPath = icon.getAttribute("data-path");

    // Try shell extension first
    const handled = await ZenShellManager.onOpen(fullPath, this);
    if (handled) return;

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
      this._updateToolbar();
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
      this._updateToolbar();
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

  /**
   * Setup FS change listener
   * @private
   */
  _setupFSListener() {
    this._fsHandler = (e) => {
      if (e.detail?.sourceAppId === this.win.element.id) {
        return;
      }
      this.navigateTo(this.currentPath, true, true);
    };
    document.addEventListener("zen-fs-change", this._fsHandler);
  }

  /**
   * Setup Layout change listener
   * @private
   */
  _setupLayoutListener() {
    this._layoutHandler = (e) => {
      if (e.detail.sourceAppId === this.win.element.id) {
        return;
      }
      if (e.detail.path === this.currentPath) {
        this.navigateTo(this.currentPath, true, true);
      }
    };
    document.addEventListener("zen-layout-change", this._layoutHandler);
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    const result = await this.navController.navigateTo(path, isHistoryNav, skipMRU);
    if (this.iconContainer) {
      this.iconContainer.setAttribute("data-current-path", this.currentPath);
      // Update autoArrange state from layout
      const layout = await ZenLayoutManager.getLayout(this.currentPath);
      this._autoArrange = layout.autoArrange;
      this._sortBy = (layout.order && layout.order.length > 0) ? null : (layout.sortBy || "name");
    }
    return result;
  }

  get sortBy() {
    return this._sortBy;
  }

  async setSortBy(value) {
    const layout = await ZenLayoutManager.getLayout(this.currentPath);
    layout.sortBy = value;

    if (this.autoArrange) {
      layout.order = []; // Clear manual order
    } else {
      // One-time arrangement to grid
      const files = await ZenShellManager.readdir(this.currentPath);
      const fileInfos = [];
      for (const file of files) {
        if (file === ".zen_layout.json") continue;
        if (RecycleBinManager.isRecycleBinPath(this.currentPath) && file === ".metadata.json") continue;

        const fullPath = joinPath(this.currentPath, file);
        try {
          const stat = await ZenShellManager.stat(fullPath);
          fileInfos.push({ name: file, stat, isDirectory: stat.isDirectory() });
        } catch (e) {
          fileInfos.push({ name: file, stat: { size: 0, mtime: new Date(0) }, isDirectory: false });
        }
      }

      // Sort
      const sortedInfos = sortFileInfos(fileInfos, value, this.currentPath);

      // Grid arrangement
      const gridX = 75;
      const gridY = 85;
      const containerWidth = this.iconContainer.clientWidth || 640;
      const cols = Math.floor(containerWidth / gridX) || 1;

      layout.positions = {};
      sortedInfos.forEach((info, index) => {
        const x = (index % cols) * gridX + 10;
        const y = Math.floor(index / cols) * gridY + 10;
        layout.positions[info.name] = { x, y };
      });
    }

    await ZenLayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
    this._sortBy = value;
    this.directoryView.renderDirectoryContents(this.currentPath);
  }

  get autoArrange() {
    if (this.viewMode === 'list' || this.viewMode === 'details') {
      return true;
    }
    return this._autoArrange;
  }

  set autoArrange(value) {
    this._autoArrange = value;
  }

  /**
   * Handle icon rearrangement within the current folder
   * @param {string[]} sourcePaths - Paths of dragged items
   * @param {number} clientX - Drop X coordinate
   * @param {number} clientY - Drop Y coordinate
   */
  /**
   * Toggle Auto Arrange for the current folder
   */
  async toggleAutoArrange() {
    const layout = await ZenLayoutManager.getLayout(this.currentPath);
    layout.autoArrange = !layout.autoArrange;
    if (layout.autoArrange) {
      layout.positions = {}; // Delete manual positions when turning ON
    } else {
      // Capture current grid positions when turning OFF
      const icons = this.iconContainer.querySelectorAll(".explorer-icon");
      const containerRect = this.iconContainer.getBoundingClientRect();
      const scrollLeft = this.iconContainer.scrollLeft;
      const scrollTop = this.iconContainer.scrollTop;

      icons.forEach((icon) => {
        const name = icon.getAttribute("data-name");
        const rect = icon.getBoundingClientRect();
        layout.positions[name] = {
          x: rect.left - containerRect.left + scrollLeft,
          y: rect.top - containerRect.top + scrollTop,
        };
      });
    }
    await ZenLayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
    this.autoArrange = layout.autoArrange;
    // Refresh the view to apply changes (e.g., add/remove classes and absolute positioning)
    this.directoryView.renderDirectoryContents(this.currentPath);
  }

  async handleRearrange(sourcePaths, x, y, offsets) {
    const layout = await ZenLayoutManager.getLayout(this.currentPath);

    if (!layout.autoArrange) {
      // Free-form placement
      sourcePaths.forEach((path, index) => {
        const name = path.split("/").pop();
        const offset = offsets ? offsets[index] : { x: index * 10, y: index * 10 };
        // Use adjusted coordinates directly
        layout.positions[name] = {
          x: x + offset.x,
          y: y + offset.y,
        };
      });
    } else {
      // Auto-arrange reordering
      const icons = [...this.iconContainer.querySelectorAll(".explorer-icon")];
      let targetIcon = null;

      // Find icon under the cursor using container-relative coordinates
      for (const icon of icons) {
        if (
          x >= icon.offsetLeft &&
          x <= icon.offsetLeft + icon.offsetWidth &&
          y >= icon.offsetTop &&
          y <= icon.offsetTop + icon.offsetHeight
        ) {
          targetIcon = icon;
          break;
        }
      }

      const draggedNames = sourcePaths.map((p) => p.split("/").pop());
      // Get current order from DOM if not in layout
      const currentOrder =
        layout.order && layout.order.length > 0
          ? [...layout.order]
          : icons.map((i) => i.getAttribute("data-name"));

      // Remove dragged items from current order to re-insert them
      let newOrder = currentOrder.filter(
        (name) => !draggedNames.includes(name),
      );

      if (targetIcon) {
        const targetName = targetIcon.getAttribute("data-name");
        const targetIndex = newOrder.indexOf(targetName);
        if (targetIndex !== -1) {
          newOrder.splice(targetIndex, 0, ...draggedNames);
        } else {
          newOrder.push(...draggedNames);
        }
      } else {
        // Drop at end
        newOrder.push(...draggedNames);
      }
      layout.order = newOrder;
    }

    await ZenLayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
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
    this._updateToolbar();
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

    // Add Animated Logo
    if (!this.logo) {
      this.logo = new AnimatedLogo();
      this.logo.classList.add("animate-only-busy");
    }

    const menuBarElement = this.menuBar.element;
    const container = document.createElement("div");
    container.className = "menu-bar-logo-wrapper";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.width = "100%";
    container.style.justifyContent = "space-between";

    // Wrap the menu bar element
    menuBarElement.parentNode.insertBefore(container, menuBarElement);
    container.appendChild(menuBarElement);
    container.appendChild(this.logo);
  }

  _updateToolbar() {
    if (this.toolbar) {
      this.toolbar.element.dispatchEvent(new Event("update"));
    }
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
    if (this._fsHandler) {
      document.removeEventListener("zen-fs-change", this._fsHandler);
    }
    if (this._layoutHandler) {
      document.removeEventListener("zen-layout-change", this._layoutHandler);
    }
  }
}
