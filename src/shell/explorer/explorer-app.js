import { Application, openApps } from '../../system/application.js';
import { mounts } from "@zenfs/core";
import { ICONS } from '../../config/icons.js';
import { getAssociation } from '../../system/directory.js';
import { launchApp } from '../../system/app-manager.js';
import { IconManager } from '../../shell/desktop/icon-manager.js';
import { AddressBar } from '../../shell/explorer/components/address-bar.js';
import { StatusBar } from '../../shared/components/status-bar.js';
import { AnimatedLogo } from '../../shared/components/animated-logo.js';
import browseUiIcons from "../../assets/icons/browse-ui-icons.png";
import browseUiIconsGrayscale from "../../assets/icons/browse-ui-icons-grayscale.png";

// Reorganized modules
import { Sidebar } from './interface/sidebar.js';
import { FileOperations } from './file-operations/file-operations.js';
import { MenuBarBuilder } from './interface/menu-bar-builder.js';
import { NavigationController } from './navigation/navigation-controller.js';
import { DirectoryView } from './interface/directory-view.js';
import { DriveManager } from './drives/drive-manager.js';
import { ContextMenuBuilder } from './interface/context-menu-builder.js';
import { KeyboardHandler } from './interface/keyboard-handler.js';
import { RecycleBinManager } from './file-operations/recycle-bin-manager.js';
import { PropertiesManager } from './file-operations/properties-manager.js';
import DragDropManager from './file-operations/drag-drop-manager.js';
import LayoutManager from './interface/layout-manager.js';
import { ShellManager } from './extensions/shell-manager.js';
import { joinPath, getDisplayName } from './navigation/path-utils.js';
import { getToolbarItems } from './interface/toolbar-builder.js';
import { sortFileInfos } from './file-operations/sort-utils.js';
import { getThemedIconObj } from './interface/file-icon-renderer.js';
import { ControlPanelExtension } from './extensions/control-panel-extension.js';
import { DesktopExtension } from './extensions/desktop-extension.js';
import { RecycleBinExtension } from './extensions/recycle-bin-extension.js';
import { NetworkNeighborhoodExtension } from './extensions/network-neighborhood-extension.js';
import { InternetExplorerExtension } from './extensions/internet-explorer-extension.js';
import { isZenFSPath, getZenFSFileUrl } from '../../system/zenfs-utils.js';
import { getMenuFromZenFS, FAVORITES_PATH } from '../start-menu/start-menu-utils.js';
import "./explorer.css";

// Initialize Shell Extensions
ShellManager.registerExtension(new ControlPanelExtension());
ShellManager.registerExtension(new DesktopExtension());
ShellManager.registerExtension(new RecycleBinExtension());
ShellManager.registerExtension(new NetworkNeighborhoodExtension());
ShellManager.registerExtension(new InternetExplorerExtension());

export class ZenExplorerApp extends Application {
  isWebPath(path) {
    if (!path) return false;
    const p = path.toLowerCase();
    if (
      p.startsWith("http://") ||
      p.startsWith("https://") ||
      p.includes("azay.rahmad")
    ) {
      return true;
    }
    // Domain-like: contains a dot, doesn't start with a slash or drive letter, and no spaces
    if (
      !path.startsWith("/") &&
      !/^[A-Z]:/i.test(path) &&
      path.includes(".") &&
      !path.includes(" ")
    ) {
      return true;
    }
    // Local HTML: must start with a slash to be considered a "web path" within the shell
    // This allows unnormalized local paths (like C:\index.html) to be normalized first
    if (path.startsWith("/") && (p.endsWith(".html") || p.endsWith(".htm"))) {
      return true;
    }
    return false;
  }

  static config = {
    id: "explorer",
    title: "Windows Explorer",
    description: "Browse files and folders.",
    icon: ICONS.windowsExplorer, category: "",
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
    this.navController = new NavigationController(this);
    this.navHistory = this.navController.navHistory; // Proxy for MenuBarBuilder
    this.directoryView = new DirectoryView(this);
    this.driveManager = new DriveManager(this);
    this.contextMenuBuilder = new ContextMenuBuilder(this);
    this.keyboardHandler = new KeyboardHandler(this);
    this.retroMode = true;
    this.blobUrl = null;
    this.isInWebMode = false;
    this._favoritesCache = null;
    this._favoritesLoading = false;
  }

  async launch(data = null) {
    if (data && typeof data === "object") {
      if (data.retroMode !== undefined) {
        this.retroMode = data.retroMode;
      }
    } else if (typeof data === "string" && data.includes("retroMode=false")) {
      this.retroMode = false;
    }

    const targetPath = this._normalizePath(data);
    let existingAppAtSamePath = null;
    let anyExplorer = false;

    for (const app of openApps.values()) {
      if (app.config?.id === this.id) {
        anyExplorer = true;
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

    // If we have any existing explorer, we need a unique windowId
    // to bypass the singleton-like check in Application.launch.
    if (anyExplorer) {
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

    // First instance: use default launch behavior (maintains #explorer ID if launched without path)
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

    if (this.isWebPath(p)) return p;

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
    // await initFileSystem();

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
      getTreeItems: async (currentPath) => {
        const items = [];
        const addItem = (name, path, iconObj, indent) => {
          items.push({ name, path, icon: iconObj[16], indent });
        };

        if (this.isInWebMode) {
          // Show history in IE mode
          return this.navHistory.history.map((url) => ({
            name: url,
            path: url,
            icon: ICONS.htmlFile[16],
            indent: 0,
          }));
        }

        // 1. Desktop
        addItem("Desktop", "/Desktop", ICONS.desktop_old, 0);

        // 2. Desktop children (virtual items)
        const desktopExt = ShellManager.getExtensionForPath("/Desktop");
        if (desktopExt) {
          for (const vItem of desktopExt.virtualItems) {
            const vPath = vItem.target && !vItem.target.startsWith("launch:") ? vItem.target : joinPath("/Desktop", vItem.name);
            let iconObj = vItem.icon;
            if (!iconObj) {
              if (vItem.name === "My Computer") iconObj = getThemedIconObj("computer");
              else if (vItem.name === "Recycle Bin") iconObj = getThemedIconObj("recycle", await RecycleBinManager.isEmpty("/Recycle Bin"));
              else if (vItem.name === "Network Neighborhood") iconObj = getThemedIconObj("network");
            }
            if (!iconObj) iconObj = ICONS.folder;

            addItem(vItem.name, vPath, iconObj, 1);

            if (vItem.name === "My Computer") {
              // 3. My Computer children (drives)
              const drives = await ShellManager.readdir("/");
              for (const drive of drives) {
                const drivePath = joinPath("/", drive);
                const driveIcon = drive === "A:" ? ICONS.disketteDrive : (drive === "E:" ? ICONS.cdDrive : ICONS.drive);
                addItem(getDisplayName(drivePath), drivePath, driveIcon, 2);

                // 4. If current path is under this drive, show ancestry
                if (currentPath.startsWith(drivePath)) {
                  const relativePath = currentPath.substring(drivePath.length).split("/").filter(Boolean);
                  let tempPath = drivePath;
                  for (let i = 0; i < relativePath.length; i++) {
                    tempPath = joinPath(tempPath, relativePath[i]);
                    const icon = ShellManager.getIconObj(tempPath) || ICONS.folderClosed;
                    addItem(relativePath[i], tempPath, icon, 3 + i);
                  }
                }
              }
            }
          }

          // 5. Folders in C:\WINDOWS\Desktop
          try {
            const desktopFiles = await fs.promises.readdir("/C:/WINDOWS/Desktop");
            for (const file of desktopFiles) {
              if (file === ".zen_layout.json") continue;
              const fullPath = joinPath("/C:/WINDOWS/Desktop", file);
              const stats = await fs.promises.stat(fullPath);
              if (stats.isDirectory()) {
                addItem(file, fullPath, ICONS.folderClosed, 1);

                // 6. If current path is under this folder
                if (currentPath.startsWith(fullPath) && currentPath !== fullPath) {
                  const relativePath = currentPath.substring(fullPath.length).split("/").filter(Boolean);
                  let tempPath = fullPath;
                  for (let i = 0; i < relativePath.length; i++) {
                    tempPath = joinPath(tempPath, relativePath[i]);
                    addItem(relativePath[i], tempPath, ICONS.folderClosed, 2 + i);
                  }
                }
              }
            }
          } catch (e) {}
        }
        return items;
      }
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

    // 5. Status Bar (Initialize early to avoid errors in _onIframeLoad)
    this.statusBar = new StatusBar();

    // 4.1 Iframe for IE Mode
    this.iframe = window.os_gui_utils.E("iframe", {
      className: "content-window",
      style:
        "width: 100%; height: 100%; flex-grow: 1; background-color: var(--Window); display: none; border: none;",
    });
    this.iframe.onload = () => this._onIframeLoad();
    content.appendChild(this.iframe);

    // 4a. Sidebar
    this.sidebar = new Sidebar();
    content.appendChild(this.sidebar.element);

    // 4b. Title (for small width)
    this.titleElement = document.createElement("h1");
    this.titleElement.className = "explorer-title";
    this.titleElement.style.fontFamily = "Verdana, sans-serif";
    content.appendChild(this.titleElement);

    // 4c. Icon View
    this.iconContainer = document.createElement("ul");
    this.iconContainer.className = `explorer-icon-view ${this.viewMode}-icons`;
    content.appendChild(this.iconContainer);

    win.$content.append(content);

    // 4d. Resize Observer for responsive layout
    this._setupResizeObserver();

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

    // 7h. Theme change listener
    this._setupThemeListener();

    // 8. Initial Navigation
    this.navigateTo(this.currentPath);

    // 9. Setup MenuBar (last, as it depends on status bar, icon manager, etc.)
    await this._updateMenuBar();

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
      onDragStart: (e, icon, selectedIcons, x, y, isTouch) => {
        DragDropManager.startDrag(
          selectedIcons,
          this,
          x !== undefined ? x : e.clientX,
          y !== undefined ? y : e.clientY,
          isTouch
        );
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
    const handled = await ShellManager.onOpen(fullPath, this);
    if (handled) return;

    // Handle .lnk files
    if (name.endsWith(".lnk.json") || name.endsWith(".lnk")) {
      try {
        const content = await fs.promises.readFile(ShellManager.getRealPath(fullPath), "utf8");
        const data = JSON.parse(content);
        if (data.type === "shortcut") {
          if (data.appId) {
            launchApp(data.appId, data.args);
            return;
          } else if (data.targetPath) {
            const stats = await ShellManager.stat(data.targetPath);
            if (stats.isDirectory()) {
              this.navigateTo(data.targetPath);
            } else {
              const targetName = data.targetPath.split("/").pop();
              const association = getAssociation(targetName);
              if (association.appId) {
                launchApp(association.appId, ShellManager.getRealPath(data.targetPath));
              } else {
                alert(`Cannot open file: ${targetName} (No association)`);
              }
            }
            return;
          }
        }
      } catch (e) {
        console.error("Failed to open shortcut", e);
      }
    }

    const association = getAssociation(name);
    if (association.appId) {
      launchApp(association.appId, ShellManager.getRealPath(fullPath));
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
    document.addEventListener("undo-change", this._undoHandler);
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
    document.addEventListener("clipboard-change", this._clipboardHandler);
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
      "recycle-bin-change",
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
    document.addEventListener("fs-change", this._fsHandler);
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
    document.addEventListener("layout-change", this._layoutHandler);
  }

  /**
   * Setup Theme change listener
   * @private
   */
  _setupThemeListener() {
    this._themeHandler = () => {
      this.navigateTo(this.currentPath, true, true);
    };
    document.addEventListener("theme-changed", this._themeHandler);
  }

  async _updateMode() {
    const isWeb = this.isInWebMode;
    const wasWeb = this.iframe.style.display === "block";

    if (isWeb) {
      this.iframe.style.display = "block";
      this.iconContainer.style.display = "none";
      this.sidebar.element.style.display = "none";
      this.content.classList.remove("with-sidebar");
      if (this.logo) this.logo.classList.remove("animate-only-busy");
    } else {
      this.iframe.style.display = "none";
      this.iconContainer.style.display = "";
      this.sidebar.element.style.display = "";
      if (this.logo) this.logo.classList.add("animate-only-busy");
      // The resize observer will handle "with-sidebar" class for non-web paths
    }

    await this._updateMenuBar();
    this._updateToolbar(isWeb !== wasWeb);
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    const result = await this.navController.navigateTo(
      path,
      isHistoryNav,
      skipMRU,
    );
    await this._updateMode();

    if (this.iconContainer) {
      this.iconContainer.setAttribute("data-current-path", this.currentPath);
      // Update autoArrange state from layout
      const layout = await LayoutManager.getLayout(this.currentPath);
      this.autoArrange = layout.autoArrange;
    }
    return result;
  }

  async sortIcons(method) {
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.sortBy = null; // Don't persist the sort method

    // Get current files and stats for sorting
    const files = await ShellManager.readdir(this.currentPath);
    const fileInfos = [];
    for (const file of files) {
      if (file === ".zen_layout.json") continue;
      if (RecycleBinManager.isRecycleBinPath(this.currentPath) && file === ".metadata.json") continue;

      const fullPath = joinPath(this.currentPath, file);
      try {
        const stat = await ShellManager.stat(fullPath);
        fileInfos.push({ name: file, stat, isDirectory: stat.isDirectory() });
      } catch (e) {
        fileInfos.push({ name: file, stat: { size: 0, mtime: new Date(0) }, isDirectory: false });
      }
    }

    // Perform sort
    const sortedInfos = sortFileInfos(fileInfos, method, this.currentPath, []);

    if (this.autoArrange) {
      // Update order for grid view
      layout.order = sortedInfos.map(info => info.name);
      layout.positions = {};
    } else {
      // Update absolute positions in a grid
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
      layout.order = sortedInfos.map(info => info.name);
    }

    await LayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
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
    this.autoArrange = !this.autoArrange;
    if (this.menuBar) {
      this.menuBar.element.dispatchEvent(new Event("update"));
    }

    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.autoArrange = this.autoArrange;
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
    await LayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
    // Refresh the view to apply changes (e.g., add/remove classes and absolute positioning)
    this.directoryView.renderDirectoryContents(this.currentPath);
  }

  async handleRearrange(sourcePaths, x, y, offsets) {
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.sortBy = null;

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

    await LayoutManager.saveLayout(this.currentPath, layout, this.win.element.id);
    this.directoryView.renderDirectoryContents(this.currentPath);
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

  async _updateMenuBar() {
    if (!this.win) return;

    // Fetch favorites if not cached
    if (!this._favoritesCache && !this._favoritesLoading) {
      this._favoritesLoading = true;
      getMenuFromZenFS(FAVORITES_PATH).then(items => {
        this._favoritesCache = items;
        this._favoritesLoading = false;
        this._updateMenuBar();
      });
    }

    const menuBuilder = new MenuBarBuilder(this);
    this.menuBar = menuBuilder.build(this._favoritesCache || []);
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

  _updateToolbar(forceRebuild = false) {
    if (!this.toolbar) return;

    if (forceRebuild) {
      const toolbarItems = getToolbarItems(this);
      const newToolbar = new window.Toolbar(toolbarItems, {
        icons: browseUiIcons,
        iconsGrayscale: browseUiIconsGrayscale,
      });
      this.toolbar.element.replaceWith(newToolbar.element);
      this.toolbar = newToolbar;
    }

    this.toolbar.element.dispatchEvent(new Event("update"));
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
    document.addEventListener("floppy-change", this._floppyHandler);
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
    document.addEventListener("cd-change", this._cdHandler);
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
      "removable-disk-change",
      this._removableDiskHandler,
    );
  }

  _onClose() {
    if (this.addressBar && this.addressBar.destroy) {
      this.addressBar.destroy();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this._clipboardHandler) {
      document.removeEventListener(
        "clipboard-change",
        this._clipboardHandler,
      );
    }
    if (this._floppyHandler) {
      document.removeEventListener("floppy-change", this._floppyHandler);
    }
    if (this._cdHandler) {
      document.removeEventListener("cd-change", this._cdHandler);
    }
    if (this._removableDiskHandler) {
      document.removeEventListener(
        "removable-disk-change",
        this._removableDiskHandler,
      );
    }
    if (this._recycleBinHandler) {
      document.removeEventListener(
        "recycle-bin-change",
        this._recycleBinHandler,
      );
    }
    if (this._undoHandler) {
      document.removeEventListener("undo-change", this._undoHandler);
    }
    if (this._fsHandler) {
      document.removeEventListener("fs-change", this._fsHandler);
    }
    if (this._layoutHandler) {
      document.removeEventListener("layout-change", this._layoutHandler);
    }
    if (this._themeHandler) {
      document.removeEventListener("theme-changed", this._themeHandler);
    }
  }

  _onIframeLoad() {
    if (!this.iframe || !this.statusBar) return;

    if (
      this.iframe.src.includes("/azay.rahmad/404.html") ||
      this.iframe.src.includes("/internet-explorer/404.html")
    ) {
      this.statusBar.setText("Page not found.");
      this._updateToolbar();
      return;
    }

    try {
      const iframeDoc = this.iframe.contentDocument;
      if (
        iframeDoc.title.includes("Not Found") ||
        iframeDoc.body.innerHTML.includes("Wayback Machine doesn")
      ) {
        this.iframe.src = "./internet-explorer/404.html";
        this.statusBar.setText("Page not found.");
      } else {
        this.statusBar.setText("Done");
      }

      // Add a click listener to the iframe content
      iframeDoc.body.addEventListener("click", (e) => {
        const anchor = e.target.closest("a");
        if (anchor && anchor.getAttribute("href")) {
          const href = anchor.getAttribute("href");
          e.preventDefault();

          // Handle relative links for azay.rahmad
          if (
            this.iframe.src.includes("azay.rahmad") &&
            !href.startsWith("http") &&
            !href.startsWith("https") &&
            !href.startsWith("//")
          ) {
            const cleanHref = href.replace("./", "");
            this.navigateTo(`azay.rahmad/${cleanHref}`);
          } else {
            this.navigateTo(href);
          }
        }
      });
    } catch (e) {
      this.statusBar.setText("Done");
    }

    this._updateToolbar();
  }

  async _loadWebUrl(url) {
    if (url.includes("azay.rahmad")) {
      let page = "home.html";
      if (url.includes("about.html") || url.endsWith("/about")) {
        page = "about.html";
      } else if (url.includes("home.html")) {
        page = "home.html";
      } else if (
        url !== "azay.rahmad" &&
        url !== "http://azay.rahmad/" &&
        url !== "http://azay.rahmad"
      ) {
        page = "404.html";
      }
      this.iframe.src = `./azay.rahmad/${page}`;
      return;
    }

    let finalUrl = url.trim();

    const isZenFS = isZenFSPath(finalUrl);
    const isLocal =
      isZenFS ||
      finalUrl.startsWith("blob:") ||
      finalUrl.startsWith("file:") ||
      finalUrl.includes("localhost") ||
      finalUrl.includes("127.0.0.1");

    if (
      !isLocal &&
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://")
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    const loadIframe = async (target) => {
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }
      if (isZenFSPath(finalUrl)) {
        this.blobUrl = target;
      }
      this.statusBar.setText("Connecting to site...");
      this.iframe.src = "about:blank";
      this.iframe.src = target;
    };

    if (isZenFS) {
      getZenFSFileUrl(finalUrl)
        .then(loadIframe)
        .catch((err) => {
          console.error("Failed to load ZenFS file in IE:", err);
          this.statusBar.setText("Failed to load local file.");
        });
    } else {
      if (this.retroMode && !isLocal) {
        const availabilityApiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(
          finalUrl,
        )}&timestamp=19980101`;

        try {
          const response = await fetch(availabilityApiUrl);

          if (!response.ok) {
            throw new Error(
              `Wayback availability check failed with status ${response.status}`,
            );
          }

          const data = await response.json();
          const snapshot = data?.archived_snapshots?.closest;
          const has1998Snapshot =
            snapshot?.available === true &&
            typeof snapshot?.timestamp === "string" &&
            snapshot.timestamp.startsWith("1998");

          if (!has1998Snapshot) {
            loadIframe("./internet-explorer/404.html");
            return;
          }

          loadIframe(`https://web.archive.org/web/1998/${finalUrl}`);
        } catch (err) {
          console.error("Failed to check Wayback availability:", err);
          loadIframe("./internet-explorer/404.html");
        }
      } else {
        loadIframe(finalUrl);
      }
    }
  }
}
