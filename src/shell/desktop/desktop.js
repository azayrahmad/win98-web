/**
 * Win98DesktopManager - Handles desktop icons and desktop interactions using ZenExplorer logic
 */
import { init as initTaskbar } from '../taskbar/taskbar.js';
import { launchApp } from '../../system/app-manager.js';
import {
  getItem,
  setItem,
  removeItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';
import { getActiveTheme, applyTheme } from '../../system/theme-manager.js';
import { getAssociation } from '../../system/directory.js';
import { IconManager } from './icon-manager.js';
import { isZenFSPath, getZenFSFileUrl } from '../../system/zenfs-utils.js';
import { fs } from "@zenfs/core";
import { ShellManager } from '../../shell/explorer/extensions/shell-manager.js';
import { renderFileIcon } from '../../shell/explorer/interface/file-icon-renderer.js';
import { FileOperations } from '../../shell/explorer/file-operations/file-operations.js';
import { DesktopContextMenuBuilder } from '../../shell/explorer/interface/desktop-context-menu-builder.js';
import DragDropManager from '../../shell/explorer/file-operations/drag-drop-manager.js';
import LayoutManager from '../../shell/explorer/interface/layout-manager.js';
import { sortFileInfos } from '../../shell/explorer/file-operations/sort-utils.js';
import { joinPath } from '../../shell/explorer/navigation/path-utils.js';
import ClipboardManager from '../../shell/explorer/file-operations/clipboard-manager.js';
import screensaver from '../../system/screensaver-utils.js';
import { getStartupApps } from '../../system/startup-manager.js';

let desktopController;
let isRefreshing = false;
let pendingRefresh = false;

class DesktopController {
  constructor(desktopElement) {
    this.currentPath = "/Desktop";
    this.iconContainer = desktopElement;
    this.win = {
      element: desktopElement,
      title: () => "Desktop",
      setMenuBar: () => {},
      setIcons: () => {},
      id: "desktop",
    };
    this.fileOps = new FileOperations(this);
    this.contextMenuBuilder = new DesktopContextMenuBuilder(this);
    this.viewMode = "large";
    this._isRenaming = false;
    this.lastSelectedIcon = null;
    this.selectionTimestamp = 0;
  }

  async navigateTo(path, isHistoryNav = false, skipMRU = false) {
    if (path === this.currentPath) {
      await refreshIcons();
    } else {
      launchApp("explorer", path);
    }
  }

  async sortIcons(method) {
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.sortBy = null;

    const files = await ShellManager.readdir(this.currentPath);
    const fileInfos = [];
    for (const file of files) {
      const fullPath = joinPath(this.currentPath, file);
      try {
        const stat = await ShellManager.stat(fullPath);
        fileInfos.push({ name: file, stat, isDirectory: stat.isDirectory() });
      } catch (e) {
        fileInfos.push({
          name: file,
          stat: { size: 0, mtime: new Date(0) },
          isDirectory: false,
        });
      }
    }

    const sortedInfos = sortFileInfos(fileInfos, method, this.currentPath, []);

    if (this.autoArrange) {
      layout.order = sortedInfos.map((info) => info.name);
      layout.positions = {};
    } else {
      const gridX = 75;
      const gridY = 75;
      const containerHeight = this.iconContainer.clientHeight || 600;
      const rows = Math.floor(containerHeight / gridY) || 1;

      layout.positions = {};
      sortedInfos.forEach((info, index) => {
        const x = Math.floor(index / rows) * gridX + 5;
        const y = (index % rows) * gridY + 5;
        layout.positions[info.name] = { x, y };
      });
      layout.order = sortedInfos.map((info) => info.name);
    }

    await LayoutManager.saveLayout(
      this.currentPath,
      layout,
      this.win.element.id,
    );
    await refreshIcons();
  }

  get autoArrange() {
    return this._autoArrange;
  }

  set autoArrange(value) {
    this._autoArrange = value;
  }

  async toggleAutoArrange() {
    this.autoArrange = !this.autoArrange;
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.autoArrange = this.autoArrange;
    if (layout.autoArrange) {
      layout.positions = {};
    } else {
      const icons = this.iconContainer.querySelectorAll(".explorer-icon");
      icons.forEach((icon) => {
        const name = icon.getAttribute("data-name");
        layout.positions[name] = {
          x: icon.offsetLeft,
          y: icon.offsetTop,
        };
      });
    }
    await LayoutManager.saveLayout(
      this.currentPath,
      layout,
      this.win.element.id,
    );
    await refreshIcons();
  }

  async handleRearrange(sourcePaths, x, y, offsets) {
    const layout = await LayoutManager.getLayout(this.currentPath);
    layout.sortBy = null;

    if (!layout.autoArrange) {
      sourcePaths.forEach((path, index) => {
        const name = path.split("/").pop();
        const offset = offsets ? offsets[index] : { x: 0, y: 0 };
        layout.positions[name] = {
          x: x + offset.x,
          y: y + offset.y,
        };
      });
    } else {
      const icons = [...this.iconContainer.querySelectorAll(".explorer-icon")];
      let targetIcon = null;

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
      const currentOrder =
        layout.order && layout.order.length > 0
          ? [...layout.order]
          : icons.map((i) => i.getAttribute("data-name"));

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
        newOrder.push(...draggedNames);
      }
      layout.order = newOrder;
    }

    await LayoutManager.saveLayout(
      this.currentPath,
      layout,
      this.win.element.id,
    );
    await refreshIcons();
  }

  handleSelectionChange() {
    const selectedIcons = this.iconManager.selectedIcons;
    if (selectedIcons.size === 1) {
      const icon = [...selectedIcons][0];
      if (this.lastSelectedIcon !== icon) {
        this.lastSelectedIcon = icon;
        this.selectionTimestamp = Date.now();
      }
    } else {
      this.lastSelectedIcon = null;
      this.selectionTimestamp = 0;
    }
  }

  async enterRenameModeByPath(path) {
    // Wait for any active refresh to complete
    while (isRefreshing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    let icon = this.iconContainer.querySelector(
      `.explorer-icon[data-path="${path}"]`,
    );

    // Retry a few times if not found, as rendering might be async
    if (!icon) {
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        while (isRefreshing) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        icon = this.iconContainer.querySelector(
          `.explorer-icon[data-path="${path}"]`,
        );
        if (icon) break;
      }
    }

    if (icon) {
      this.iconManager.setSelection(new Set([icon]));
      this.enterRenameMode(icon);
    }
  }

  async enterRenameMode(icon) {
    if (this._isRenaming) return;
    const path = icon.getAttribute("data-path");
    const isVirtual = icon.getAttribute("data-is-virtual") === "true";
    if (isVirtual) return;

    this._isRenaming = true;
    const label = icon.querySelector(".icon-label");
    const fullPath = path;
    const oldName = fullPath.split("/").pop();
    const isShortcut = oldName.endsWith(".lnk.json") || oldName.endsWith(".lnk");
    const textarea = document.createElement("textarea");
    textarea.className = "icon-label-input";
    textarea.value = isShortcut ? oldName.replace(".lnk.json", "").replace(".lnk", "") : oldName;
    textarea.spellcheck = false;

    // Hide label and add textarea as sibling
    label.style.display = "none";
    icon.appendChild(textarea);

    const adjustTextareaHeight = (ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    };
    adjustTextareaHeight(textarea);

    textarea.scrollIntoView({ block: "nearest" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this._isRenaming) return;
        const dotIndex = oldName.lastIndexOf(".");
        if (dotIndex > 0 && icon.getAttribute("data-type") !== "directory")
          textarea.setSelectionRange(0, dotIndex);
        else textarea.select();
        textarea.focus();
      });
    });

    textarea.addEventListener("input", () => adjustTextareaHeight(textarea));

    const finishRename = async (save) => {
      if (!this._isRenaming) return;
      this._isRenaming = false;

      let newName = textarea.value.trim();
      if (isShortcut && newName && !newName.endsWith(".lnk.json") && !newName.endsWith(".lnk")) {
        newName += ".lnk.json";
      }
      
      // Clean up UI immediately
      textarea.remove();
      label.style.display = "";
      
      if (save && newName && newName !== oldName) {
        // Optimistic update
        label.textContent = newName;

        try {
          const parentPath =
            fullPath.substring(0, fullPath.lastIndexOf("/")) || "/";
          const newPath = joinPath(parentPath, newName);
          await fs.promises.rename(
            ShellManager.getRealPath(fullPath),
            ShellManager.getRealPath(newPath),
          );
        } catch (e) {
          alert(`Error renaming: ${e.message}`);
        } finally {
          await refreshIcons();
          document.dispatchEvent(
            new CustomEvent("fs-change", { detail: { sourceAppId: "desktop" } }),
          );
        }
      } else {
        // Already reverted by label.style.display = "" above
      }
    };
    textarea.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        finishRename(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finishRename(false);
      }
    };
    textarea.onblur = () => finishRename(true);
    textarea.onmousedown = (e) => e.stopPropagation();
    textarea.onclick = (e) => e.stopPropagation();
    textarea.ondblclick = (e) => e.stopPropagation();
  }

  async onOpen(path) {
    const handled = await ShellManager.onOpen(path, {
      navigateTo: (p) => launchApp("explorer", p),
    });
    if (handled) return;

    const name = path.split("/").pop();
    if (name.endsWith(".lnk.json") || name.endsWith(".lnk")) {
      try {
        const content = await fs.promises.readFile(ShellManager.getRealPath(path), "utf8");
        const data = JSON.parse(content);
        if (data.type === "shortcut") {
          if (data.appId) {
            launchApp(data.appId, data.args);
            return;
          } else if (data.targetPath) {
            const stats = await ShellManager.stat(data.targetPath);
            if (stats.isDirectory()) {
              launchApp("explorer", data.targetPath);
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

    const stat = await ShellManager.stat(path);
    if (stat.isDirectory()) {
      launchApp("explorer", path);
    } else {
      const association = getAssociation(path.split("/").pop());
      if (association.appId) {
        launchApp(association.appId, ShellManager.getRealPath(path));
      }
    }
  }

  async openFile(icon) {
    const path = icon.getAttribute("data-path");
    await this.onOpen(path);
  }
}

export async function setupIcons() {
  await refreshIcons();
}

async function refreshIcons() {
  if (isRefreshing) {
    pendingRefresh = true;
    while (isRefreshing) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return;
  }
  isRefreshing = true;

  const desktop = document.querySelector(".desktop");
  const path = "/Desktop";
  const layout = await LayoutManager.getLayout(path);
  desktopController.autoArrange = layout.autoArrange;

  let rawFiles = await ShellManager.readdir(path);
  rawFiles = rawFiles.filter((f) => f !== ".zen_layout.json");

  const fileInfos = [];
  for (const file of rawFiles) {
    const fullPath = joinPath(path, file);
    try {
      const fileStat = await ShellManager.stat(fullPath);
      fileInfos.push({
        name: file,
        fullPath,
        stat: fileStat,
        isDirectory: fileStat.isDirectory(),
      });
    } catch (e) {
      fileInfos.push({
        name: file,
        fullPath,
        stat: { size: 0, mtime: new Date(0) },
        isDirectory: false,
      });
    }
  }

  const sortBy = layout.sortBy || null;
  const order = layout.order || [];
  const sortedInfos = sortFileInfos(fileInfos, sortBy, path, order);

  desktop.innerHTML = "";
  desktopController.iconManager.clearSelection();

  if (layout.autoArrange) {
    desktop.classList.remove("has-absolute-icons");
  } else {
    desktop.classList.add("has-absolute-icons");
  }

  const icons = [];
  for (const info of sortedInfos) {
    const { name: file, fullPath, stat: fileStat, isDirectory: isDir } = info;
    try {
      const iconDiv = await renderFileIcon(file, fullPath, isDir, {
        stat: fileStat,
      });
      desktopController.iconManager.configureIcon(iconDiv);

      iconDiv.addEventListener("click", (e) => {
        if (desktopController._isRenaming) return;
        if (
          desktopController.lastSelectedIcon === iconDiv &&
          Date.now() - desktopController.selectionTimestamp > 500
        ) {
          desktopController.enterRenameMode(iconDiv);
          e.stopPropagation();
        }
      });

      if (!layout.autoArrange) {
        iconDiv.style.position = "absolute";
        if (layout.positions && layout.positions[file]) {
          iconDiv.style.left = `${layout.positions[file].x}px`;
          iconDiv.style.top = `${layout.positions[file].y}px`;
        } else {
          const gridX = 75;
          const gridY = 75;
          const containerHeight = desktop.clientHeight || 600;
          const rows = Math.floor(containerHeight / gridY) || 1;
          const index = icons.length;
          const x = Math.floor(index / rows) * gridX + 5;
          const y = (index % rows) * gridY + 5;
          iconDiv.style.left = `${x}px`;
          iconDiv.style.top = `${y}px`;
        }
      }
      icons.push(iconDiv);
      desktop.appendChild(iconDiv);
    } catch (e) {
      console.error(e);
    }
  }

  isRefreshing = false;
  if (pendingRefresh) {
    pendingRefresh = false;
    await refreshIcons();
  }
}

function updateCutIcons() {
  const { items, operation } = ClipboardManager.get();
  const cutPaths = operation === "cut" ? new Set(items) : new Set();
  const icons = document.querySelectorAll(".desktop .explorer-icon");
  icons.forEach((icon) => {
    const path = icon.getAttribute("data-path");
    if (cutPaths.has(path)) icon.classList.add("cut");
    else icon.classList.remove("cut");
  });
}

function getWallpaperMode() {
  return getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "tile";
}

let currentWallpaperBlobUrl = null;

async function applyWallpaper() {
  const theme = getActiveTheme();
  const wallpaper = getItem(LOCAL_STORAGE_KEYS.WALLPAPER) || theme.wallpaper;
  const desktop = document.querySelector(".desktop");

  if (currentWallpaperBlobUrl) {
    URL.revokeObjectURL(currentWallpaperBlobUrl);
    currentWallpaperBlobUrl = null;
  }

  if (wallpaper) {
    let wallpaperUrl = wallpaper;
    if (isZenFSPath(wallpaper)) {
      try {
        wallpaperUrl = await getZenFSFileUrl(wallpaper);
        currentWallpaperBlobUrl = wallpaperUrl;
      } catch (e) {
        console.error("Failed to load ZenFS wallpaper:", e);
      }
    }

    const mode = getWallpaperMode();
    desktop.style.backgroundImage = `url(${wallpaperUrl})`;
    desktop.style.backgroundPosition = "left top";
    if (mode === "stretch") {
      desktop.style.backgroundRepeat = "no-repeat";
      desktop.style.backgroundSize = "100% 100%";
    } else if (mode === "center") {
      desktop.style.backgroundRepeat = "no-repeat";
      desktop.style.backgroundSize = "auto";
      desktop.style.backgroundPosition = "center";
    } else {
      // 'tile'
      desktop.style.backgroundRepeat = "repeat";
      desktop.style.backgroundSize = "auto";
    }
    desktop.style.backgroundColor = "";
  } else {
    desktop.style.backgroundImage = "";
    desktop.style.backgroundColor = "var(--Background)";
  }
}

function getMonitorType() {
  return getItem(LOCAL_STORAGE_KEYS.MONITOR_TYPE) || "TFT";
}

function applyMonitorType() {
  const type = getMonitorType();
  if (type === "CRT") {
    document.body.classList.add("scanlines");
  } else {
    document.body.classList.remove("scanlines");
  }
}

export async function initDesktop(profile = null) {
  console.log("Initializing Desktop Manager...");
  await applyTheme();
  await applyWallpaper();
  applyMonitorType();

  const desktop = document.querySelector(".desktop");
  desktop.setAttribute("data-current-path", "/Desktop");
  desktopController = new DesktopController(desktop);

  desktopController.iconManager = new IconManager(desktop, {
    iconSelector: ".explorer-icon",
    onDragStart: (e, icon, selectedIcons, x, y, isTouch) => {
      DragDropManager.startDrag(
        selectedIcons,
        desktopController,
        x !== undefined ? x : e.clientX,
        y !== undefined ? y : e.clientY,
        isTouch
      );
    },
    onItemContext: (e, icon) => {
      const menuItems = desktopController.contextMenuBuilder.buildItemMenu(
        e,
        icon,
      );
      new window.ContextMenu(menuItems, e);
    },
    onBackgroundContext: (e) => {
      const menuItems = desktopController.contextMenuBuilder.buildBackgroundMenu(
        e,
      );
      new window.ContextMenu(menuItems, e);
    },
    onSelectionChange: () => {
      desktopController.handleSelectionChange();
      updateCutIcons();
    },
  });

  desktop.addEventListener("dblclick", (e) => {
    const icon = e.target.closest(".explorer-icon");
    if (icon) {
      const path = icon.getAttribute("data-path");
      desktopController.onOpen(path);
    }
  });

  window.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      tag === "BUTTON" ||
      e.target.closest(".os-window")
    ) {
      return;
    }

    const selectedIcons = [...desktopController.iconManager.selectedIcons];

    if (e.key === "F2" && selectedIcons.length === 1) {
      desktopController.enterRenameMode(selectedIcons[0]);
      e.preventDefault();
    } else if (e.key === "Enter" && selectedIcons.length > 0) {
      selectedIcons.forEach((icon) => desktopController.openFile(icon));
      e.preventDefault();
    } else if (e.key === "Delete" && selectedIcons.length > 0) {
      const paths = selectedIcons.map((i) => i.getAttribute("data-path"));
      desktopController.fileOps.deleteItems(paths, e.shiftKey);
      e.preventDefault();
    }
  });

  // A function to refresh icons, bound to the correct scope
  desktop.refreshIcons = () => refreshIcons();

  await refreshIcons();

  document.addEventListener("theme-changed", () => {
    refreshIcons();
    applyWallpaper();
  });

  document.addEventListener("desktop-refresh", () => {
    refreshIcons();
  });

  document.addEventListener("clipboard-change", updateCutIcons);

  document.addEventListener("recycle-bin-change", () => {
    refreshIcons();
  });

  initTaskbar();

  const launchStartupApps = async () => {
    if (profile) {
      if (profile.startup && profile.startup.length > 0) {
        profile.startup.forEach((app) => {
          const appId = typeof app === "string" ? app : app.appId;
          const data = typeof app === "object" ? app.data : null;
          launchApp(appId, data);
        });
      }
    } else {
      const startupApps = await getStartupApps();
      if (startupApps && startupApps.length > 0) {
        startupApps.forEach((appId) => {
          launchApp(appId);
        });
      }
    }
  };

  document.addEventListener("desktop-ready-to-launch-apps", launchStartupApps, {
    once: true,
  });

  document.addEventListener("wallpaper-changed", applyWallpaper);

  // FS change listener
  document.addEventListener("fs-change", (e) => {
    if (e.detail?.sourceAppId === "desktop") return;
    refreshIcons();
  });

  // Layout change listener
  document.addEventListener("layout-change", (e) => {
    if (e.detail.sourceAppId === "desktop") return;
    if (e.detail.path === "/Desktop") refreshIcons();
  });

  // Native drop handler
  desktop.addEventListener("dragover", (e) => e.preventDefault());
  desktop.addEventListener("drop", (e) => {
    e.preventDefault();
  });
}
