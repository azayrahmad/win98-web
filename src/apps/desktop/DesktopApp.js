import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { taskbar } from "../../components/taskbar.js";
import { getItem, LOCAL_STORAGE_KEYS } from "../../utils/localStorage.js";
import { ZenDirectoryView } from '../zenexplorer/components/ZenDirectoryView.js';
import { IconManager } from '../../components/IconManager.js';
import ZenLayoutManager from '../zenexplorer/utils/ZenLayoutManager.js';
import ZenDragDropManager from '../zenexplorer/utils/ZenDragDropManager.js';
import { ZenContextMenuBuilder } from '../zenexplorer/utils/ZenContextMenuBuilder.js';
import { ZenShellManager } from '../zenexplorer/utils/ZenShellManager.js';
import { getAssociation } from '../../utils/directory.js';

export class DesktopApp extends Application {
  static config = {
    id: "desktop",
    title: "Desktop",
    description: "System Desktop",
    icon: ICONS.desktop,
    isSingleton: true,
    hasTaskbarButton: false,
  };

  constructor(config) {
    super(config);
    this.currentPath = "/C:/WINDOWS/Desktop";
    this.viewMode = "large";
  }

  async _onLaunch() {
    // 1. Initialize Taskbar
    await taskbar.init();

    // 2. Initialize Wallpaper
    this.applyWallpaper();

    // 3. Initialize Icon Container
    this.iconContainer = document.getElementById('desktop');
    if (!this.iconContainer) {
      console.error('Desktop container not found');
      return;
    }

    this.iconContainer.innerHTML = '';
    this.iconContainer.className = 'desktop explorer-icon-view large-icons';
    this.iconContainer.setAttribute('data-current-path', this.currentPath);

    // 4. Initialize Directory View and Context Menu
    this.directoryView = new ZenDirectoryView(this);
    this.contextMenuBuilder = new ZenContextMenuBuilder(this);

    // Mock status bar for ZenDirectoryView
    this.statusBar = { setText: () => {} };

    // 5. Initialize Icon Manager
    this.iconManager = new IconManager(this.iconContainer, {
      iconSelector: '.explorer-icon',
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
        this.directoryView.handleSelectionChange();
      }
    });

    // 6. Setup event listeners
    this._setupEventListeners();

    // 7. Initial refresh
    await this.refresh();
  }

  _setupEventListeners() {
    this.iconContainer.addEventListener('dblclick', (e) => {
      const icon = e.target.closest('.explorer-icon');
      if (icon) {
        this.openFile(icon);
      }
    });

    // FS change listener
    this._fsHandler = (e) => {
      if (e.detail?.path === this.currentPath || e.detail?.path === '/') {
        this.refresh();
      }
    };
    document.addEventListener('zen-fs-change', this._fsHandler);

    // Layout change listener
    this._layoutHandler = (e) => {
      if (e.detail.path === this.currentPath) {
        this.refresh();
      }
    };
    document.addEventListener('zen-layout-change', this._layoutHandler);

    // Wallpaper listener
    this._wallpaperHandler = () => {
      this.applyWallpaper();
    };
    document.addEventListener('wallpaper-changed', this._wallpaperHandler);
  }

  applyWallpaper() {
    const screen = document.getElementById("screen");
    if (!screen) return;

    const wallpaper = getItem(LOCAL_STORAGE_KEYS.WALLPAPER);
    const mode = getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "stretch";

    if (wallpaper && wallpaper !== "none") {
      const img = new Image();
      img.onload = () => {
        screen.style.backgroundImage = `url(${wallpaper})`;
        screen.style.backgroundRepeat = "no-repeat";
        screen.style.backgroundPosition = "center center";

        switch (mode) {
          case "stretch":
            screen.style.backgroundSize = "100% 100%";
            break;
          case "center":
            screen.style.backgroundSize = "auto";
            break;
          case "tile":
            screen.style.backgroundRepeat = "repeat";
            screen.style.backgroundSize = "auto";
            screen.style.backgroundPosition = "0 0";
            break;
          default:
            screen.style.backgroundSize = "100% 100%";
            break;
        }
      };
      img.src = wallpaper;
    } else {
      screen.style.backgroundImage = "none";
    }
  }

  async refresh() {
    await this.directoryView.renderDirectoryContents(this.currentPath);
    const layout = await ZenLayoutManager.getLayout(this.currentPath);
    this._autoArrange = layout.autoArrange;
  }

  get autoArrange() {
    return this._autoArrange;
  }

  set autoArrange(value) {
    this._autoArrange = value;
  }

  async handleRearrange(sourcePaths, x, y, offsets) {
    const layout = await ZenLayoutManager.getLayout(this.currentPath);
    if (!layout.autoArrange) {
      sourcePaths.forEach((path, index) => {
        const name = path.split('/').pop();
        const offset = offsets ? offsets[index] : { x: 0, y: 0 };
        layout.positions[name] = { x: x + offset.x, y: y + offset.y };
      });
    } else {
      // Simple reorder for desktop
      const names = sourcePaths.map(p => p.split('/').pop());
      const currentOrder = layout.order || [];
      let newOrder = currentOrder.filter(n => !names.includes(n));
      newOrder.push(...names);
      layout.order = newOrder;
    }
    await ZenLayoutManager.saveLayout(this.currentPath, layout);
  }

  async openFile(icon) {
    const name = icon.getAttribute('data-name');
    const fullPath = icon.getAttribute('data-path');
    const type = icon.getAttribute('data-type');

    // Try shell extension first
    const handled = await ZenShellManager.onOpen(fullPath, this);
    if (handled) return;

    const { launchApp } = await import('../../utils/appManager.js');
    if (type === 'directory') {
      launchApp('zenexplorer', fullPath);
    } else {
      const association = getAssociation(name);
      if (association.appId) {
        launchApp(association.appId, fullPath);
      } else {
        alert(`Cannot open file: ${name}`);
      }
    }
  }

  async _createWindow() {
    // Desktop doesn't have a traditional window
    return null;
  }

  _onClose() {
    if (this._fsHandler) {
      document.removeEventListener('zen-fs-change', this._fsHandler);
    }
    if (this._layoutHandler) {
      document.removeEventListener('zen-layout-change', this._layoutHandler);
    }
    if (this._wallpaperHandler) {
      document.removeEventListener('wallpaper-changed', this._wallpaperHandler);
    }
  }
}

export default DesktopApp;
