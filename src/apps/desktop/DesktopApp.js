import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { IconManager } from "../../components/IconManager.js";
import { DirectoryView } from "../zenexplorer/interface/DirectoryView.js";
import { FileOperations } from "../zenexplorer/fileoperations/FileOperations.js";
import { ContextMenuBuilder } from "../zenexplorer/interface/ContextMenuBuilder.js";
import LayoutManager from "../zenexplorer/interface/LayoutManager.js";
import DragDropManager from "../zenexplorer/fileoperations/DragDropManager.js";
import { getItem, LOCAL_STORAGE_KEYS } from "../../utils/localStorage.js";
import { getActiveTheme } from "../../utils/themeManager.js";
import { ShellManager } from "../zenexplorer/extensions/ShellManager.js";

class DesktopContextMenuBuilder extends ContextMenuBuilder {
  buildBackgroundMenu(e) {
    const menuItems = super.buildBackgroundMenu(e);

    // Remove "View" menu
    const viewIndex = menuItems.findIndex(item => item.label === "View");
    if (viewIndex !== -1) {
      menuItems.splice(viewIndex, 1);
    }

    // Replace Properties action
    const propertiesItem = menuItems.find(item => item.label === "Properties");
    if (propertiesItem) {
      propertiesItem.action = () => window.System.launchApp("displayproperties");
    }

    return menuItems;
  }
}

export class DesktopApp extends Application {
  static config = {
    id: "desktop",
    title: "Desktop",
    icon: ICONS.desktop,
    isSingleton: true,
    hasTaskbarButton: false,
  };

  constructor(config) {
    super(config);
    this.currentPath = "/Desktop";
    this.viewMode = "large";
    this.isColumnLayout = true;
    this.autoArrange = true;
  }

  async _createWindow() {
    // Desktop doesn't have a standard window.
    // We return a mock object that mimics the expected window interface.
    this.element = document.querySelector(".desktop");
    this.area = document.querySelector(".desktop-area");
    this.iconContainer = this.element;

    return {
      element: this.element,
      onClosed: () => {},
      center: () => {},
      focus: () => {},
      bringToFront: () => {},
      restore: () => {},
      title: () => {},
      setIcons: () => {},
    };
  }

  async _onLaunch() {
    this.fileOps = new FileOperations(this);
    this.directoryView = new DirectoryView(this);
    this.contextMenuBuilder = new DesktopContextMenuBuilder(this);

    this._setupIconManager();
    this._setupEventListeners();
    this._setupDisplayListeners();

    await this.refresh();
  }

  _setupIconManager() {
    this.iconManager = new IconManager(this.iconContainer, {
      iconSelector: ".explorer-icon",
      onDragStart: (e, icon, selectedIcons) => {
        DragDropManager.startDrag(selectedIcons, this, e.clientX, e.clientY);
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
        this.directoryView.handleSelectionChange();
      },
    });
  }

  _setupEventListeners() {
    this.iconContainer.addEventListener("dblclick", (e) => {
      const icon = e.target.closest(".explorer-icon");
      if (icon) {
        this.openFile(icon);
      }
    });

    document.addEventListener("fs-change", (e) => {
      if (e.detail?.sourceAppId === "desktop") return;
      this.refresh();
    });

    document.addEventListener("desktop-refresh", () => {
        this.refresh();
    });

    document.addEventListener("layout-change", (e) => {
        if (e.detail.sourceAppId === "desktop") return;
        if (e.detail.path === this.currentPath) {
            this.refresh();
        }
    });

    // Handle drops from outside
    this.area.addEventListener("dragover", (e) => e.preventDefault());
    this.area.addEventListener("drop", (e) => this._handleDrop(e));
  }

  _setupDisplayListeners() {
    const applyWallpaper = () => {
      const theme = getActiveTheme();
      const wallpaper = getItem(LOCAL_STORAGE_KEYS.WALLPAPER) || theme.wallpaper;
      const mode = getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "tile";

      if (wallpaper) {
        this.element.style.backgroundImage = `url(${wallpaper})`;
        this.element.style.backgroundPosition = "left top";
        if (mode === "stretch") {
          this.element.style.backgroundRepeat = "no-repeat";
          this.element.style.backgroundSize = "100% 100%";
        } else if (mode === "center") {
          this.element.style.backgroundRepeat = "no-repeat";
          this.element.style.backgroundSize = "auto";
          this.element.style.backgroundPosition = "center";
        } else {
          // 'tile'
          this.element.style.backgroundRepeat = "repeat";
          this.element.style.backgroundSize = "auto";
        }
        this.element.style.backgroundColor = "";
      } else {
        this.element.style.backgroundImage = "";
        this.element.style.backgroundColor = "var(--Background)";
      }
    };

    document.addEventListener("wallpaper-changed", applyWallpaper);
    document.addEventListener("theme-changed", () => {
        applyWallpaper();
        this.refresh();
    });

    applyWallpaper();
  }

  async refresh() {
    const layout = await LayoutManager.getLayout(this.currentPath);
    this.autoArrange = layout.autoArrange;
    await this.directoryView.renderDirectoryContents(this.currentPath);
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    // Desktop doesn't really navigate, but it needs to implement this for FileOperations
    if (path === this.currentPath) {
        await this.refresh();
    }
  }

  async openFile(icon) {
    const fullPath = icon.getAttribute("data-path");
    const handled = await ShellManager.onOpen(fullPath, this);
    if (handled) return;

    // Fallback handled by ShellManager or specific apps
  }

  async toggleAutoArrange() {
    this.autoArrange = !this.autoArrange;
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.autoArrange = this.autoArrange;

    if (layout.autoArrange) {
      layout.positions = {};
    } else {
      const icons = this.iconContainer.querySelectorAll(".explorer-icon");
      const containerRect = this.iconContainer.getBoundingClientRect();
      icons.forEach((icon) => {
        const name = icon.getAttribute("data-name");
        const rect = icon.getBoundingClientRect();
        layout.positions[name] = {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
        };
      });
    }

    await LayoutManager.saveLayout(this.currentPath, layout, "desktop");
    this.refresh();
  }

  async sortIcons(method) {
    // Implementation similar to ZenExplorerApp
    const files = await ShellManager.readdir(this.currentPath);
    const fileInfos = [];
    for (const file of files) {
        if (file === ".zen_layout.json") continue;
        const fullPath = this.currentPath + "/" + file;
        try {
            const stat = await ShellManager.stat(fullPath);
            fileInfos.push({ name: file, stat, isDirectory: stat.isDirectory() });
        } catch (e) {
            fileInfos.push({ name: file, stat: { size: 0, mtime: new Date(0) }, isDirectory: false });
        }
    }

    const { sortFileInfos } = await import("../zenexplorer/fileoperations/SortUtils.js");
    const sortedInfos = sortFileInfos(fileInfos, method, this.currentPath, []);

    const layout = await LayoutManager.getLayout(this.currentPath);
    if (this.autoArrange) {
        layout.order = sortedInfos.map(info => info.name);
        layout.positions = {};
    } else {
        const gridX = 75;
        const gridY = 85;
        const rows = Math.floor(this.iconContainer.clientHeight / gridY) || 1;
        layout.positions = {};
        sortedInfos.forEach((info, index) => {
            const x = Math.floor(index / rows) * gridX + 10;
            const y = (index % rows) * gridY + 10;
            layout.positions[info.name] = { x, y };
        });
        layout.order = sortedInfos.map(info => info.name);
    }

    await LayoutManager.saveLayout(this.currentPath, layout, "desktop");
    this.refresh();
  }

  async handleRearrange(sourcePaths, x, y, offsets) {
    const layout = await LayoutManager.getLayout(this.currentPath);
    if (!layout.autoArrange) {
        sourcePaths.forEach((path, index) => {
            const name = path.split("/").pop();
            const offset = offsets ? offsets[index] : { x: 0, y: 0 };
            layout.positions[name] = { x: x + offset.x, y: y + offset.y };
        });
    } else {
        // ... same reordering logic as ZenExplorerApp if needed,
        // but for desktop reordering is usually just snapping or manual
    }
    await LayoutManager.saveLayout(this.currentPath, layout, "desktop");
    this.refresh();
  }

  enterRenameModeByPath(path) {
    this.directoryView.enterRenameModeByPath(path);
  }

  _handleDrop(e) {
    e.preventDefault();
    const jsonData = e.dataTransfer.getData("application/json");
    if (jsonData) {
        const data = JSON.parse(jsonData);
        const { items, cursorOffsetX, cursorOffsetY, dragOffsets, sourcePath } = data;

        if (sourcePath === this.currentPath) {
            const rect = this.iconContainer.getBoundingClientRect();
            const dropX = e.clientX - rect.left - cursorOffsetX;
            const dropY = e.clientY - rect.top - cursorOffsetY;
            this.handleRearrange(items, dropX, dropY, dragOffsets);
            return;
        }

        // Drop from elsewhere to desktop
        this.fileOps.moveItemsDirect(items, this.currentPath, {
            dropX: e.clientX - this.iconContainer.getBoundingClientRect().left - cursorOffsetX,
            dropY: e.clientY - this.iconContainer.getBoundingClientRect().top - cursorOffsetY,
            offsets: dragOffsets
        });
    }
  }
}

export default DesktopApp;
